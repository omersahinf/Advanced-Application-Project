import '@angular/compiler';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DomSanitizer } from '@angular/platform-browser';
import { ChatbotComponent } from './chatbot';
import type { ChatService, StreamHandlers } from '../../services/chat.service';
import type { AuthService } from '../../services/auth.service';

describe('ChatbotComponent streaming state', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function setup() {
    let handlers: StreamHandlers | undefined;
    const controller = { abort: vi.fn() } as unknown as AbortController;

    const chatService = {
      streamMessage: vi.fn((_message: string, nextHandlers: StreamHandlers) => {
        handlers = nextHandlers;
        return controller;
      }),
    } as unknown as ChatService;

    const authService = {
      currentRole: () => 'ADMIN',
      isAdmin: () => true,
    } as unknown as AuthService;

    const sanitizer = {
      bypassSecurityTrustResourceUrl: vi.fn((value: string) => `safe:${value}`),
    } as unknown as DomSanitizer;

    const component = new ChatbotComponent(chatService, authService, sanitizer);
    return {
      component,
      controller,
      sanitizer,
      getHandlers: () => handlers!,
    };
  }

  it('keeps updating the same assistant placeholder through final event', () => {
    const { component, getHandlers } = setup();

    component.userInput = 'hello';
    component.send();

    const handlers = getHandlers();
    handlers.onStep({
      step: 'guardrails',
      status: 'done',
      payload: { is_in_scope: false, is_greeting: true },
    });
    handlers.onFinal({
      answer: 'Hello! I am your analytics assistant.',
      is_in_scope: false,
      is_greeting: true,
    });

    const messages = component.messages();
    expect(messages).toHaveLength(2);
    expect(messages[1].role).toBe('assistant');
    expect(messages[1].text).toBe('Hello! I am your analytics assistant.');
    expect(messages[1].refused).toBe(false);
    expect(messages[1].timeline).toHaveLength(1);
    expect(messages[1].showTimeline).toBe(false);
    expect(component.loading()).toBe(false);
  });

  it('renders final answer after in-scope step updates', () => {
    const { component, getHandlers } = setup();

    component.userInput = 'What is total revenue?';
    component.send();

    const handlers = getHandlers();
    handlers.onStep({
      step: 'guardrails',
      status: 'done',
      payload: { is_in_scope: true, is_greeting: false },
    });
    handlers.onStep({
      step: 'generate_sql',
      status: 'done',
      payload: { sql_query: 'SELECT 1' },
    });
    handlers.onFinal({
      answer: 'Total revenue is 100.',
      is_in_scope: true,
      sql_query: 'SELECT 1',
      data: { columns: ['total_revenue'], rows: [{ total_revenue: 100 }], row_count: 1 },
    });

    const assistant = component.messages()[1];
    expect(assistant.text).toBe('Total revenue is 100.');
    expect(assistant.sqlQuery).toBe('SELECT 1');
    expect(assistant.data?.row_count).toBe(1);
    expect(assistant.timeline).toHaveLength(2);
  });

  it('renders an error message and stops loading when the stream fails', () => {
    const { component, getHandlers } = setup();

    component.userInput = 'Show revenue';
    component.send();
    getHandlers().onError('Network error');

    const assistant = component.messages()[1];
    expect(assistant.text).toBe('Sorry, an error occurred: Network error');
    expect(assistant.refused).toBe(true);
    expect(assistant.showTimeline).toBe(false);
    expect(component.loading()).toBe(false);
  });

  it('creates a sanitized Blob URL when visualization HTML is returned', () => {
    const { component, getHandlers, sanitizer } = setup();
    const createObjectURL = vi.fn(() => 'blob:chart-1');

    vi.stubGlobal('URL', {
      createObjectURL,
      revokeObjectURL: vi.fn(),
    });

    component.userInput = 'Show revenue trend';
    component.send();
    getHandlers().onFinal({
      answer: 'Revenue trend ready.',
      is_in_scope: true,
      visualization_html: '<html><body>chart</body></html>',
    });

    const assistant = component.messages()[1];
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect((sanitizer.bypassSecurityTrustResourceUrl as any)).toHaveBeenCalledWith('blob:chart-1');
    expect(assistant.vizUrl).toBe('safe:blob:chart-1');
  });

  it('aborts the active stream and revokes Blob URLs on destroy', () => {
    const { component, controller, getHandlers } = setup();
    const revokeObjectURL = vi.fn();

    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:chart-2'),
      revokeObjectURL,
    });

    component.userInput = 'Show revenue trend';
    component.send();
    getHandlers().onFinal({
      answer: 'Revenue trend ready.',
      is_in_scope: true,
      visualization_html: '<html><body>chart</body></html>',
    });

    component.ngOnDestroy();

    expect((controller.abort as any)).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:chart-2');
  });

  it('derives readable timeline details from execute, retry, and visualize events', () => {
    const { component, getHandlers } = setup();

    component.userInput = 'Retry this query';
    component.send();

    const handlers = getHandlers();
    handlers.onStep({
      step: 'execute',
      status: 'done',
      payload: { error: 'syntax error' },
    });
    handlers.onStep({
      step: 'error_handler',
      status: 'done',
      payload: { iteration_count: 2 },
    });
    handlers.onStep({
      step: 'visualize',
      status: 'done',
      payload: { has_chart: true },
    });

    const details = component.messages()[1].timeline?.map((step) => step.detail);
    expect(details).toEqual(['error — retrying', 'retry #2', 'chart generated']);
  });
});
