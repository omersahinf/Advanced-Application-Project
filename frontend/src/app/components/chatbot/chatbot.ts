/**
 * Analytics Chat — pixel-parity replica of Flower Prototype.html
 * §ChatbotPage.
 *
 * Inventory (verbatim from prototype):
 *   Layout: two columns, `1fr 300px`, height `calc(100vh - topbar)`,
 *   no page padding. Right rail has `Agent pipeline` · `Session
 *   context` · `Try asking`.
 *
 *   Intro message (assistant, first turn):
 *     "Hi <first>, I'm Flower's analytics assistant. I translate
 *      natural-language questions into SQL queries, run them
 *      against the read-only replica, and explain the results in
 *      plain English."
 *     Notice card: "Role-scoped access" + "You're authenticated as
 *      <ROLE>. Every SQL query I run has a role filter injected
 *      deterministically — I physically cannot see another user's
 *      private data, even if the LLM is tricked."
 *
 *   Pipeline rows (5 fixed):
 *     Guardrails    — "Is the question in scope? Any prompt injection?"
 *     SQL Generator — "Translate natural language to SQL + inject role filter"
 *     Executor      — "Run SELECT against read-only database"
 *     Analyst       — "Explain results in natural language"
 *     Visualizer    — "Build Plotly chart (AST-validated, sandboxed)"
 *
 *   Result card tabs: Chart · Table · SQL (+ edit / download icon buttons)
 *   SQL pane footer: "Role filter injected deterministically. The
 *     :store_id / :user_id bind parameters come from the JWT's
 *     verified claims — never from the LLM output or conversation
 *     history."
 *   Composer footer chips (fixed):
 *     "Role-scoped via JWT" · "SELECT-only · READ ONLY txn" · "Gemini · LangGraph"
 *
 *   Prototype suggestedPrompts verbatim per role:
 *     ADMIN      : Show me sales by category for last month / Compare
 *                  this month vs last month / What's the trend in order
 *                  cancellations? / Which stores have the most orders?
 *     CORPORATE  : What are my top 5 customers by revenue? / Which
 *                  products have the lowest ratings? / How many orders
 *                  were shipped by air? / What's my revenue trend over
 *                  the last 6 months?
 *     INDIVIDUAL : How much have I spent this year? / What categories
 *                  do I buy from the most? / Show my order history
 *                  with delivery status / Which of my reviews got the
 *                  most helpful votes?
 *
 * Adaptations (backend-backed, no API changes):
 *   - Prototype "CANNED" answers are replaced by the real streaming
 *     `/api/chat/stream` SSE pipeline (ChatService). Pipeline events
 *     from the backend (`guardrails` / `generate_sql` / `execute` /
 *     `error_handler` / `analyze` / `decide_graph` / `visualize`) are
 *     mapped to the 5 prototype steps for rail highlighting.
 *   - Blocked/refused turns render the prototype's red "Request
 *     blocked" card when the final payload has `is_in_scope=false`
 *     (and it's not a greeting).
 *   - Chart is rendered via the sandboxed Plotly iframe produced by
 *     the Visualizer agent. When `data` rows come back but no
 *     visualization_html, we still render the table + SQL tabs.
 *   - Session context box shows what auth actually exposes:
 *       user_role = auth.currentRole()
 *       user_id   = current email (proxy) or —
 *       store_id  = current company or — (non-corporate)
 *       session   = short id hashed from chat sessionId
 *       turns     = user-turns count / 10 cap from prototype
 *     No backend or schema changes.
 */
import {
  AfterViewChecked,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { ChatService, StreamStepEvent } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { FlowerIconComponent, FlowerIconName } from '../../shared/flower-icon/flower-icon';

/* -------------------- Types -------------------- */

interface TimelineStep {
  step: string;
  icon: string;
  label: string;
  status: 'running' | 'done' | 'error';
  detail?: string;
}

type AssistantKind = 'streaming' | 'text' | 'blocked' | 'result' | 'error';

interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  kind?: AssistantKind;
  refused?: boolean;
  sqlQuery?: string;
  data?: { columns: string[]; rows: Record<string, any>[]; row_count: number };
  vizUrl?: SafeResourceUrl;
  hasChart?: boolean;
  showSql?: boolean;
  showData?: boolean;
  timeline?: TimelineStep[];
  showTimeline?: boolean;
  streaming?: boolean;
  /** Which of prototype's 5 pipeline steps is highlighted right now. */
  currentStep?: number;
  /** Selected tab on the result card (prototype default: "answer"). */
  activeTab?: 'chart' | 'table' | 'sql';
}

type PipelineKey = 'guardrails' | 'sql' | 'exec' | 'analyst' | 'viz';

interface PipelineRow {
  key: PipelineKey;
  label: string;
  icon: FlowerIconName;
  desc: string;
}

/** 5 fixed pipeline rows, copied verbatim from Flower Prototype.html §PIPELINE. */
const PIPELINE: PipelineRow[] = [
  { key: 'guardrails', label: 'Guardrails',    icon: 'shield',   desc: 'Is the question in scope? Any prompt injection?' },
  { key: 'sql',        label: 'SQL Generator', icon: 'database', desc: 'Translate natural language to SQL + inject role filter' },
  { key: 'exec',       label: 'Executor',      icon: 'bolt',     desc: 'Run SELECT against read-only database' },
  { key: 'analyst',    label: 'Analyst',       icon: 'book',     desc: 'Explain results in natural language' },
  { key: 'viz',        label: 'Visualizer',    icon: 'chart',    desc: 'Build Plotly chart (AST-validated, sandboxed)' },
];

/** Backend step -> pipeline row index mapping. */
const STEP_TO_PIPELINE: Record<string, number> = {
  guardrails: 0,
  generate_sql: 1,
  execute: 2,
  error_handler: 2,
  analyze: 3,
  decide_graph: 3,
  visualize: 4,
};

/** Suggested prompts by role (verbatim, Flower Prototype.html §suggestedPrompts). */
const SUGGESTED_PROMPTS: Record<string, string[]> = {
  ADMIN: [
    'Show me sales by category for last month',
    'Compare this month vs last month',
    "What's the trend in order cancellations?",
    'Which stores have the most orders?',
  ],
  CORPORATE: [
    'What are my top 5 customers by revenue?',
    'Which products have the lowest ratings?',
    'How many orders were shipped by air?',
    "What's my revenue trend over the last 6 months?",
  ],
  INDIVIDUAL: [
    'How much have I spent this year?',
    'What categories do I buy from the most?',
    'Show my order history with delivery status',
    'Which of my reviews got the most helpful votes?',
  ],
};

/* -------------------- Component -------------------- */

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [FormsModule, FlowerIconComponent],
  templateUrl: './chatbot.html',
  styleUrls: ['./chatbot.scss'],
})
export class ChatbotComponent implements AfterViewChecked, OnDestroy {
  @ViewChild('scroll') private scrollEl?: ElementRef<HTMLDivElement>;

  readonly pipeline = PIPELINE;
  readonly messages = signal<ChatMessage[]>([]);
  readonly loading = signal(false);
  userInput = '';

  private readonly nextIdSeed = signal(1);
  private readonly activeStep = signal<number | null>(null);
  private blobUrls: string[] = [];
  private activeStream?: AbortController;

  private readonly chatSessionId: string = this.safeUuid();

  readonly sessionShort = this.chatSessionId
    ? `sess_${this.chatSessionId.slice(0, 4)}…${this.chatSessionId.slice(-4)}`
    : 'sess_—';

  readonly suggestedPrompts = computed(() => {
    const role = this.auth.currentRole() || 'INDIVIDUAL';
    return SUGGESTED_PROMPTS[role] ?? SUGGESTED_PROMPTS['INDIVIDUAL'];
  });

  readonly turnCount = computed(
    () => this.messages().filter((m) => m.role === 'user').length,
  );

  readonly currentStepIndex = computed(() => this.activeStep());

  /* Intro avatar / role labels */
  readonly firstName = computed(
    () =>
      this.auth.currentFirstName() ||
      (this.auth.currentEmail() ?? 'there').split('@')[0],
  );

  readonly userInitial = computed(() =>
    (this.auth.currentFirstName() || this.auth.currentEmail() || 'U')
      .trim()
      .charAt(0)
      .toUpperCase(),
  );

  constructor(
    private chatService: ChatService,
    public auth: AuthService,
    private sanitizer: DomSanitizer,
  ) {}

  ngAfterViewChecked(): void {
    // Keep the conversation pinned to the latest message after each
    // change-detection cycle — mirrors the prototype's useEffect on
    // [messages, thinking].
    const el = this.scrollEl?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }

  ngOnDestroy(): void {
    this.blobUrls.forEach((url) => URL.revokeObjectURL(url));
    this.blobUrls = [];
    this.activeStream?.abort();
  }

  /* -------------------- Actions -------------------- */

  askSuggestion(text: string): void {
    this.userInput = text;
    this.send();
  }

  onKeydown(ev: KeyboardEvent): void {
    if (ev.key === 'Enter' && !ev.shiftKey) {
      ev.preventDefault();
      this.send();
    }
  }

  send(): void {
    const text = this.userInput.trim();
    if (!text) return;

    this.messages.update((msgs) => [
      ...msgs,
      this.createMessage('user', text),
    ]);
    this.userInput = '';
    this.loading.set(true);

    // Seed an assistant placeholder — fills in as stream events arrive.
    const placeholder = this.createMessage('assistant', '', {
      kind: 'streaming',
      timeline: [],
      showTimeline: true,
      streaming: true,
      currentStep: 0,
      activeTab: 'chart',
    });
    this.messages.update((msgs) => [...msgs, placeholder]);
    this.activeStep.set(0);

    const updatePlaceholder = (mutate: (m: ChatMessage) => void) => {
      this.updateMessage(placeholder.id, mutate);
    };

    this.activeStream = this.chatService.streamMessage(text, {
      onStep: (event: StreamStepEvent) => {
        const idx = STEP_TO_PIPELINE[event.step];
        if (typeof idx === 'number') this.activeStep.set(idx);
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
          if (typeof idx === 'number') m.currentStep = idx;
        });
      },
      onFinal: (payload: Record<string, any>) => {
        updatePlaceholder((m) => {
          m.streaming = false;
          const answer =
            typeof payload['answer'] === 'string' ? payload['answer'].trim() : '';
          m.text = answer || 'No answer generated.';
          const refused =
            payload['is_in_scope'] === false && payload['is_greeting'] !== true;
          m.refused = refused;
          m.sqlQuery = payload['sql_query'] ?? undefined;
          m.data = payload['data'] ?? undefined;
          m.showTimeline = false;

          if (payload['visualization_html']) {
            const blob = new Blob([payload['visualization_html']], {
              type: 'text/html',
            });
            const url = URL.createObjectURL(blob);
            this.blobUrls.push(url);
            m.vizUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
            m.hasChart = true;
          }

          // Decide final rendering kind.
          if (refused) {
            m.kind = 'blocked';
          } else if (m.sqlQuery || m.data || m.hasChart) {
            m.kind = 'result';
            m.activeTab = m.hasChart ? 'chart' : m.data ? 'table' : 'sql';
          } else {
            m.kind = 'text';
          }
        });
        this.activeStep.set(null);
        this.loading.set(false);
      },
      onError: (message: string) => {
        updatePlaceholder((m) => {
          m.streaming = false;
          m.text = `Sorry, an error occurred: ${message}`;
          m.refused = true;
          m.showTimeline = false;
          m.kind = 'error';
        });
        this.activeStep.set(null);
        this.loading.set(false);
      },
    });
  }

  setTab(msg: ChatMessage, tab: 'chart' | 'table' | 'sql'): void {
    this.updateMessage(msg.id, (m) => (m.activeTab = tab));
  }

  /* -------------------- Rail ----------------------- */

  pipelineState(index: number): 'idle' | 'active' | 'done' {
    const cur = this.currentStepIndex();
    if (cur === null || cur === undefined) return 'idle';
    if (index === cur) return 'active';
    if (index < cur) return 'done';
    return 'idle';
  }

  /* -------------------- Helpers -------------------- */

  /** Prototype user_id/store_id fields — adapted to what auth exposes. */
  userIdLine(): string {
    return this.auth.currentEmail() || '—';
  }

  storeIdLine(): string {
    return this.auth.isCorporate() ? this.auth.currentCompany() || '—' : '—';
  }

  iconForColumn(col: string): boolean {
    return /revenue|spent|total|price|rate|rating|count|orders|row_count/i.test(col);
  }

  formatCell(col: string, value: unknown): string {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'number') {
      if (/revenue|spent|total|price|amount/i.test(col)) {
        return (
          '$' +
          value.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
        );
      }
      if (/rate/i.test(col) && Math.abs(value) <= 1) {
        return (value * 100).toFixed(1) + '%';
      }
      if (/rating/i.test(col)) return value.toFixed(2) + '★';
      return value.toLocaleString('en-US');
    }
    return String(value);
  }

  isNumericCol(columns: string[], rows: Record<string, any>[], col: string): boolean {
    const sample = rows.find((r) => r[col] !== null && r[col] !== undefined);
    return typeof sample?.[col] === 'number';
  }

  /* -------------------- internals ------------------ */

  private createMessage(
    role: 'user' | 'assistant',
    text: string,
    extras: Partial<ChatMessage> = {},
  ): ChatMessage {
    const id = this.nextIdSeed();
    this.nextIdSeed.set(id + 1);
    return { id, role, text, ...extras };
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
        return typeof p['row_count'] === 'number'
          ? `${p['row_count']} rows`
          : undefined;
      case 'error_handler':
        return `retry #${p['iteration_count'] ?? '?'}`;
      case 'visualize':
        return p['has_chart'] ? 'chart generated' : 'no chart';
      default:
        return undefined;
    }
  }

  private safeUuid(): string {
    try {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
      }
    } catch {
      /* fall through */
    }
    return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  }
}
