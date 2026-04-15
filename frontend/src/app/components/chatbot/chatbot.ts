import { Component, signal, ViewChild, ElementRef, AfterViewChecked, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ChatService } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { ChatResponse } from '../../models/product.model';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  refused?: boolean;
  sqlQuery?: string;
  data?: { columns: string[]; rows: Record<string, any>[]; row_count: number };
  vizUrl?: SafeResourceUrl;
  showSql?: boolean;
  showData?: boolean;
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
              <p class="subtitle">Multi-Agent Text2SQL &mdash; ask anything about your e-commerce data</p>
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
                <button (click)="askSuggestion('What is the total revenue by store?')">Revenue by store</button>
                <button (click)="askSuggestion('Show me the top 5 best selling products')">Top products</button>
                <button (click)="askSuggestion('How many orders are in each status?')">Orders by status</button>
                <button (click)="askSuggestion('What are the average ratings by product?')">Avg ratings</button>
                <button (click)="askSuggestion('Show low stock products')">Low stock alert</button>
                <button (click)="askSuggestion('Customer spending by city')">Spend by city</button>
              </div>
            </div>
          }
          @for (msg of messages(); track $index) {
            <div class="message" [class.user]="msg.role === 'user'" [class.assistant]="msg.role === 'assistant'" [class.refused]="msg.refused">
              <div class="message-label">{{ msg.role === 'user' ? 'You' : 'AI Assistant' }}</div>
              <div class="message-text">{{ msg.text }}</div>

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

              @if (msg.vizUrl) {
                <div class="viz-container">
                  <iframe [src]="msg.vizUrl" sandbox="allow-scripts" width="100%" height="420" frameborder="0"></iframe>
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
          <input type="text" [(ngModel)]="userInput" name="message"
                 placeholder="Ask about sales, products, orders, customers..."
                 [disabled]="loading()" maxlength="500" autocomplete="off"
                 aria-label="Chat message input" />
          <button type="submit" class="btn btn-primary" [disabled]="loading() || !userInput.trim()">
            {{ loading() ? '...' : 'Send' }}
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .page { padding-top: 20px; padding-bottom: 20px; }
    .chat-container {
      max-width: 900px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      height: calc(100vh - 120px);
      padding: 0;
      overflow: hidden;
    }
    .chat-header { padding: 16px 24px; border-bottom: 1px solid #eee; }
    .header-row { display: flex; justify-content: space-between; align-items: center; }
    .chat-header h2 { margin-bottom: 2px; font-size: 20px; }
    .subtitle { color: #888; font-size: 13px; }
    .role-badge {
      padding: 4px 12px; border-radius: 12px; font-size: 11px;
      font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
    }
    .badge-admin { background: #fce4ec; color: #c62828; }
    .badge-corporate { background: #e3f2fd; color: #1565c0; }
    .badge-individual { background: #e8f5e9; color: #2e7d32; }
    .messages { flex: 1; overflow-y: auto; padding: 20px 24px; }
    .welcome { text-align: center; padding: 30px 0; }
    .welcome-icon { font-size: 48px; margin-bottom: 12px; }
    .welcome p { margin-bottom: 8px; color: #555; }
    .hint { font-size: 13px; color: #999; }
    .suggestions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 12px; }
    .suggestions button {
      background: #f0f4ff; border: 1px solid #d0d8f0; border-radius: 20px;
      padding: 8px 16px; font-size: 13px; cursor: pointer; color: #4361ee; transition: all 0.2s;
    }
    .suggestions button:hover { background: #dce4ff; border-color: #4361ee; }
    .message { margin-bottom: 16px; max-width: 90%; }
    .message.user { margin-left: auto; }
    .message-label { font-size: 11px; color: #999; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.3px; }
    .message.user .message-label { text-align: right; }
    .message-text {
      padding: 12px 16px; border-radius: 12px; font-size: 14px;
      line-height: 1.6; white-space: pre-wrap; word-break: break-word;
    }
    .message.user .message-text { background: #4361ee; color: white; border-bottom-right-radius: 4px; }
    .message.assistant .message-text { background: #f0f2f5; color: #333; border-bottom-left-radius: 4px; }
    .message.refused .message-text { background: #fff3cd; color: #856404; }
    .typing { font-style: italic; color: #888; display: flex; align-items: center; gap: 6px; }
    .dot {
      width: 6px; height: 6px; border-radius: 50%; background: #999;
      animation: bounce 1.4s infinite ease-in-out both;
    }
    .dot:nth-child(1) { animation-delay: -0.32s; }
    .dot:nth-child(2) { animation-delay: -0.16s; }
    @keyframes bounce {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1); }
    }
    .toggle-btn {
      background: none; border: 1px solid #ddd; border-radius: 6px;
      padding: 4px 10px; font-size: 11px; color: #666; cursor: pointer;
      margin-top: 6px; margin-right: 6px; transition: all 0.2s;
    }
    .toggle-btn:hover { border-color: #4361ee; color: #4361ee; }
    .sql-block {
      background: #1e1e2e; color: #a6e3a1; padding: 12px 16px; border-radius: 8px;
      font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: 12px;
      margin-top: 8px; overflow-x: auto; white-space: pre-wrap;
    }
    .data-table-wrapper { margin-top: 8px; overflow-x: auto; border-radius: 8px; border: 1px solid #e0e0e0; }
    .data-table {
      width: 100%; border-collapse: collapse; font-size: 12px;
    }
    .data-table th {
      background: #f5f5f5; padding: 8px 12px; text-align: left;
      font-weight: 600; border-bottom: 2px solid #ddd; white-space: nowrap;
    }
    .data-table td { padding: 6px 12px; border-bottom: 1px solid #eee; }
    .data-table tr:hover td { background: #f9f9ff; }
    .truncated { font-size: 11px; color: #999; text-align: center; padding: 6px; }
    .viz-container { margin-top: 12px; border-radius: 8px; overflow: hidden; }
    .input-area {
      display: flex; gap: 10px; padding: 16px 24px;
      border-top: 1px solid #eee; background: white;
    }
    .input-area input {
      flex: 1; padding: 10px 14px; border: 1px solid #ddd; border-radius: 8px;
      font-size: 14px; transition: border 0.2s;
    }
    .input-area input:focus { outline: none; border-color: #4361ee; }
  `]
})
export class ChatbotComponent implements AfterViewChecked, OnDestroy {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  messages = signal<ChatMessage[]>([]);
  userInput = '';
  loading = signal(false);
  private blobUrls: string[] = [];

  constructor(
    private chatService: ChatService,
    public auth: AuthService,
    private sanitizer: DomSanitizer
  ) {}

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  ngOnDestroy() {
    this.blobUrls.forEach(url => URL.revokeObjectURL(url));
    this.blobUrls = [];
  }

  askSuggestion(text: string) {
    this.userInput = text;
    this.send();
  }

  send() {
    const text = this.userInput.trim();
    if (!text) return;

    this.messages.update(msgs => [...msgs, { role: 'user', text }]);
    this.userInput = '';
    this.loading.set(true);

    this.chatService.sendMessage(text).subscribe({
      next: (res: ChatResponse) => {
        const msg: ChatMessage = {
          role: 'assistant',
          text: res.answer,
          refused: res.refused,
          sqlQuery: res.sqlQuery,
          data: res.data,
          showSql: false,
          showData: false,
        };
        if (res.visualizationHtml) {
          const blob = new Blob([res.visualizationHtml], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          this.blobUrls.push(url);
          msg.vizUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
        }
        this.messages.update(msgs => [...msgs, msg]);
        this.loading.set(false);
      },
      error: () => {
        this.messages.update(msgs => [...msgs, {
          role: 'assistant',
          text: 'Sorry, an error occurred. Please try again.',
          refused: true
        }]);
        this.loading.set(false);
      }
    });
  }

  private scrollToBottom() {
    if (this.messagesContainer) {
      const el = this.messagesContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
    }
  }
}
