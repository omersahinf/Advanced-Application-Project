import {
  Component,
  signal,
  ViewChild,
  ElementRef,
  AfterViewChecked,
  OnDestroy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ChatService, StreamStepEvent } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';

interface TimelineStep {
  step: string;
  icon: string;
  label: string;
  status: 'running' | 'done' | 'error';
  detail?: string;
}

interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  refused?: boolean;
  sqlQuery?: string;
  data?: { columns: string[]; rows: Record<string, any>[]; row_count: number };
  vizUrl?: SafeResourceUrl;
  showSql?: boolean;
  showData?: boolean;
  timeline?: TimelineStep[];
  showTimeline?: boolean;
  streaming?: boolean;
}

@Component({
  selector: 'app-chatbot',
  imports: [FormsModule],
  template: `
    <div class="container page">
      <div class="chat-container card">
        <div class="chat-header">
          <div class="header-row">
            <div>
              <h2>AI Analytics Chatbot</h2>
              <p class="subtitle">
                Multi-Agent Text2SQL &mdash; ask anything about your e-commerce data
              </p>
            </div>
            <span class="role-badge" [class]="'badge-' + (auth.currentRole() || '').toLowerCase()">
              {{ auth.currentRole() }}
            </span>
          </div>
        </div>

        <div class="messages" #messagesContainer>
          @if (messages().length === 0) {
            <div class="welcome">
              <div class="welcome-icon">🤖</div>
              <p><strong>I can query your e-commerce database using natural language!</strong></p>
              <p class="hint">Try one of these suggestions:</p>
              <div class="suggestions">
                <button (click)="askSuggestion('What is the total revenue by store?')">
                  Revenue by store
                </button>
                <button (click)="askSuggestion('Show me the top 5 best selling products')">
                  Top products
                </button>
                <button (click)="askSuggestion('How many orders are in each status?')">
                  Orders by status
                </button>
                <button (click)="askSuggestion('What are the average ratings by product?')">
                  Avg ratings
                </button>
                <button (click)="askSuggestion('Show low stock products')">Low stock alert</button>
                <button (click)="askSuggestion('Customer spending by city')">Spend by city</button>
              </div>
            </div>
          }
          @for (msg of messages(); track msg.id) {
            <div
              class="message"
              [class.user]="msg.role === 'user'"
              [class.assistant]="msg.role === 'assistant'"
              [class.refused]="msg.refused"
            >
              <div class="message-label">{{ msg.role === 'user' ? 'You' : 'AI Assistant' }}</div>

              @if (msg.role === 'assistant' && msg.timeline && msg.timeline.length > 0) {
                <button class="toggle-btn" (click)="msg.showTimeline = !msg.showTimeline">
                  {{ msg.showTimeline ? 'Hide' : 'Show' }} execution steps ({{ msg.timeline.length }})
                </button>
                @if (msg.showTimeline) {
                  <ul class="timeline">
                    @for (s of msg.timeline; track s.step + $index) {
                      <li class="timeline-item" [class]="'status-' + s.status">
                        <span class="timeline-icon">{{ s.icon }}</span>
                        <span class="timeline-label">{{ s.label }}</span>
                        @if (s.status === 'running') {
                          <span class="timeline-spinner"></span>
                        } @else if (s.status === 'done') {
                          <span class="timeline-check">✓</span>
                        } @else {
                          <span class="timeline-err">✗</span>
                        }
                        @if (s.detail) {
                          <span class="timeline-detail">{{ s.detail }}</span>
                        }
                      </li>
                    }
                  </ul>
                }
              }

              @if (msg.text) {
                <div class="message-text">{{ msg.text }}</div>
              }

              @if (auth.isAdmin()) {
                @if (msg.sqlQuery) {
                  <button class="toggle-btn" (click)="msg.showSql = !msg.showSql">
                    {{ msg.showSql ? 'Hide' : 'Show' }} SQL
                  </button>
                  @if (msg.showSql) {
                    <pre class="sql-block">{{ msg.sqlQuery }}</pre>
                  }
                }

                @if (msg.data && msg.data.rows.length > 0) {
                  <button class="toggle-btn" (click)="msg.showData = !msg.showData">
                    {{ msg.showData ? 'Hide' : 'Show' }} Data ({{ msg.data.row_count }} rows)
                  </button>
                  @if (msg.showData) {
                    <div class="data-table-wrapper">
                      <table class="data-table">
                        <thead>
                          <tr>
                            @for (col of msg.data.columns; track col) {
                              <th>{{ col }}</th>
                            }
                          </tr>
                        </thead>
                        <tbody>
                          @for (row of msg.data.rows.slice(0, 20); track $index) {
                            <tr>
                              @for (col of msg.data.columns; track col) {
                                <td>{{ row[col] }}</td>
                              }
                            </tr>
                          }
                        </tbody>
                      </table>
                      @if (msg.data.rows.length > 20) {
                        <p class="truncated">Showing 20 of {{ msg.data.row_count }} rows</p>
                      }
                    </div>
                  }
                }
              }

              @if (msg.vizUrl) {
                <div class="viz-container">
                  <iframe
                    [src]="msg.vizUrl"
                    sandbox="allow-scripts"
                    width="100%"
                    height="420"
                    frameborder="0"
                  ></iframe>
                </div>
              }
            </div>
          }
          @if (loading()) {
            <div class="message assistant">
              <div class="message-label">AI Assistant</div>
              <div class="message-text typing">
                <span class="dot"></span><span class="dot"></span><span class="dot"></span>
                Analyzing your question...
              </div>
            </div>
          }
        </div>

        <form class="input-area" (ngSubmit)="send()">
          <input
            type="text"
            [(ngModel)]="userInput"
            name="message"
            placeholder="Ask about sales, products, orders, customers..."
            [disabled]="loading()"
            maxlength="500"
            autocomplete="off"
            aria-label="Chat message input"
          />
          <button type="submit" class="btn btn-primary" [disabled]="loading() || !userInput.trim()">
            {{ loading() ? '...' : 'Send' }}
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [
    `
      .page {
        padding-top: 20px;
        padding-bottom: 20px;
      }
      .chat-container {
        max-width: 900px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        height: calc(100vh - 60px);
        padding: 0;
        overflow: hidden;
        background: #ffffeb;
        border: 1px solid #d5d5c0;
        border-radius: 16px;
      }
      .chat-header {
        padding: 16px 24px;
        border-bottom: 1px solid #d5d5c0;
      }
      .header-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .chat-header h2 {
        margin-bottom: 2px;
        font-size: 20px;
        color: #1a1a1a;
      }
      .subtitle {
        color: #666;
        font-size: 13px;
      }
      .role-badge {
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .badge-admin {
        background: #fee2e2;
        color: #dc2626;
      }
      .badge-corporate {
        background: #034f46;
        color: #ffffeb;
      }
      .badge-individual {
        background: #dcfce7;
        color: #16a34a;
      }
      .messages {
        flex: 1;
        overflow-y: auto;
        padding: 20px 24px;
      }
      .welcome {
        text-align: center;
        padding: 30px 0;
      }
      .welcome-icon {
        font-size: 48px;
        margin-bottom: 12px;
      }
      .welcome p {
        margin-bottom: 8px;
        color: #666;
      }
      .hint {
        font-size: 13px;
        color: #999;
      }
      .suggestions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        justify-content: center;
        margin-top: 12px;
      }
      .suggestions button {
        background: #034f46;
        border: 1px solid #034f46;
        border-radius: 20px;
        padding: 8px 16px;
        font-size: 13px;
        cursor: pointer;
        color: #ffffeb;
        transition: all 0.2s;
      }
      .suggestions button:hover {
        background: rgba(3, 79, 70, 0.15);
        border-color: #034f46;
      }
      .message {
        margin-bottom: 16px;
        max-width: 90%;
      }
      .message.user {
        margin-left: auto;
      }
      .message-label {
        font-size: 11px;
        color: #999;
        margin-bottom: 4px;
        text-transform: uppercase;
        letter-spacing: 0.3px;
      }
      .message.user .message-label {
        text-align: right;
      }
      .message-text {
        padding: 12px 16px;
        border-radius: 12px;
        font-size: 14px;
        line-height: 1.6;
        white-space: pre-wrap;
        word-break: break-word;
      }
      .message.user .message-text {
        background: #034f46;
        color: white;
        border-bottom-right-radius: 4px;
      }
      .message.assistant .message-text {
        background: #e4e4d0;
        color: #1a1a1a;
        border-bottom-left-radius: 4px;
      }
      .message.refused .message-text {
        background: #fef3c7;
        color: #92400e;
      }
      .typing {
        font-style: italic;
        color: #666;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #999;
        animation: bounce 1.4s infinite ease-in-out both;
      }
      .dot:nth-child(1) {
        animation-delay: -0.32s;
      }
      .dot:nth-child(2) {
        animation-delay: -0.16s;
      }
      @keyframes bounce {
        0%,
        80%,
        100% {
          transform: scale(0);
        }
        40% {
          transform: scale(1);
        }
      }
      .toggle-btn {
        background: none;
        border: 1px solid #c8c8b4;
        border-radius: 6px;
        padding: 4px 10px;
        font-size: 11px;
        color: #666;
        cursor: pointer;
        margin-top: 6px;
        margin-right: 6px;
        transition: all 0.2s;
      }
      .toggle-btn:hover {
        border-color: #034f46;
        color: #034f46;
      }
      .sql-block {
        background: #1e1e2e;
        color: #a6e3a1;
        padding: 12px 16px;
        border-radius: 8px;
        font-family: 'JetBrains Mono', 'Fira Code', monospace;
        font-size: 12px;
        margin-top: 8px;
        overflow-x: auto;
        white-space: pre-wrap;
      }
      .data-table-wrapper {
        margin-top: 8px;
        overflow-x: auto;
        border-radius: 8px;
        border: 1px solid #d5d5c0;
      }
      .data-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 12px;
      }
      .data-table th {
        background: #f5f5e1;
        padding: 8px 12px;
        text-align: left;
        font-weight: 600;
        border-bottom: 1px solid #d5d5c0;
        white-space: nowrap;
        color: #666;
      }
      .data-table td {
        padding: 6px 12px;
        border-bottom: 1px solid #d5d5c0;
        color: #1a1a1a;
      }
      .data-table tr:hover td {
        background: #f5f5e1;
      }
      .truncated {
        font-size: 11px;
        color: #999;
        text-align: center;
        padding: 6px;
      }
      .viz-container {
        margin-top: 12px;
        border-radius: 8px;
        overflow: hidden;
      }
      .input-area {
        display: flex;
        gap: 10px;
        padding: 16px 24px;
        border-top: 1px solid #d5d5c0;
        background: #ffffeb;
      }
      .input-area input {
        flex: 1;
      }
      .input-area input:focus {
        outline: none;
        border-color: #034f46;
      }
      .timeline {
        list-style: none;
        padding: 10px 14px;
        margin: 8px 0;
        background: #f5f5e1;
        border-radius: 10px;
        border: 1px solid #d5d5c0;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .timeline-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        color: #444;
      }
      .timeline-icon {
        font-size: 14px;
      }
      .timeline-label {
        font-weight: 600;
      }
      .timeline-detail {
        color: #777;
        font-style: italic;
        margin-left: 4px;
      }
      .timeline-check {
        color: #16a34a;
        font-weight: 700;
      }
      .timeline-err {
        color: #dc2626;
        font-weight: 700;
      }
      .timeline-spinner {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        border: 2px solid #034f46;
        border-right-color: transparent;
        animation: spin 0.8s linear infinite;
      }
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
      .timeline-item.status-running {
        color: #034f46;
      }
    `,
  ],
})
export class ChatbotComponent implements AfterViewChecked, OnDestroy {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  messages = signal<ChatMessage[]>([]);
  userInput = '';
  loading = signal(false);
  private blobUrls: string[] = [];
  private activeStream?: AbortController;
  private nextMessageId = 1;

  constructor(
    private chatService: ChatService,
    public auth: AuthService,
    private sanitizer: DomSanitizer,
  ) {}

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  ngOnDestroy() {
    this.blobUrls.forEach((url) => URL.revokeObjectURL(url));
    this.blobUrls = [];
    this.activeStream?.abort();
  }

  askSuggestion(text: string) {
    this.userInput = text;
    this.send();
  }

  send() {
    const text = this.userInput.trim();
    if (!text) return;

    this.messages.update((msgs) => [...msgs, this.createMessage('user', text)]);
    this.userInput = '';
    this.loading.set(true);

    // Seed an assistant placeholder that will fill in as events arrive.
    const placeholder = this.createMessage('assistant', '', {
      timeline: [],
      showTimeline: true,
      streaming: true,
    });
    this.messages.update((msgs) => [...msgs, placeholder]);

    const updatePlaceholder = (mutate: (m: ChatMessage) => void) => {
      this.updateMessage(placeholder.id, mutate);
    };

    this.activeStream = this.chatService.streamMessage(text, {
      onStep: (event: StreamStepEvent) => {
        updatePlaceholder((m) => {
          const timeline = [...(m.timeline ?? [])];
          timeline.push({
            step: event.step,
            icon: event.icon ?? '•',
            label: event.label ?? event.step,
            status: event.status === 'error' ? 'error' : 'done',
            detail: this.describePayload(event),
          });
          m.timeline = timeline;
        });
      },
      onFinal: (payload: Record<string, any>) => {
        updatePlaceholder((m) => {
          m.streaming = false;
          const answer = typeof payload['answer'] === 'string' ? payload['answer'].trim() : '';
          m.text = answer || 'No answer generated.';
          m.refused = payload['is_in_scope'] === false && payload['is_greeting'] !== true;
          m.sqlQuery = payload['sql_query'] ?? undefined;
          m.data = payload['data'] ?? undefined;
          m.showTimeline = false;
          if (payload['visualization_html']) {
            const blob = new Blob([payload['visualization_html']], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            this.blobUrls.push(url);
            m.vizUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
          }
        });
        this.loading.set(false);
      },
      onError: (message: string) => {
        updatePlaceholder((m) => {
          m.streaming = false;
          m.text = `Sorry, an error occurred: ${message}`;
          m.refused = true;
          m.showTimeline = false;
        });
        this.loading.set(false);
      },
    });
  }

  private createMessage(
    role: 'user' | 'assistant',
    text: string,
    extras: Partial<ChatMessage> = {},
  ): ChatMessage {
    return {
      id: this.nextMessageId++,
      role,
      text,
      ...extras,
    };
  }

  private updateMessage(id: number, mutate: (m: ChatMessage) => void) {
    this.messages.update((msgs) =>
      msgs.map((msg) => {
        if (msg.id !== id) return msg;
        const next = { ...msg };
        mutate(next);
        return next;
      }),
    );
  }

  private describePayload(event: StreamStepEvent): string | undefined {
    const p = event.payload ?? {};
    switch (event.step) {
      case 'guardrails':
        if (p['is_greeting']) return 'greeting';
        return p['is_in_scope'] === false ? 'out of scope' : 'in scope';
      case 'generate_sql':
        return p['sql_query'] ? 'SQL ready' : undefined;
      case 'execute':
        if (p['error']) return `error — retrying`;
        return typeof p['row_count'] === 'number' ? `${p['row_count']} rows` : undefined;
      case 'error_handler':
        return `retry #${p['iteration_count'] ?? '?'}`;
      case 'visualize':
        return p['has_chart'] ? 'chart generated' : 'no chart';
      default:
        return undefined;
    }
  }

  private scrollToBottom() {
    if (this.messagesContainer) {
      const el = this.messagesContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
    }
  }
}
