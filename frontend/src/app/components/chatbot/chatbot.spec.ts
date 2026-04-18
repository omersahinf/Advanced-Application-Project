import '@angular/compiler';
import { describe, expect, it, vi } from 'vitest';
import { DomSanitizer } from '@angular/platform-browser';
import { ChatbotComponent } from './chatbot';
import type { ChatService, StreamHandlers } from '../../services/chat.service';
import type { AuthService } from '../../services/auth.service';

describe('ChatbotComponent streaming state', () => {
  function setup() {
    let handlers: StreamHandlers | undefined;

    const chatService = {
      streamMessage: vi.fn((_message: string, nextHandlers: StreamHandlers) => {
        handlers = nextHandlers;
        return new AbortController();
      }),
    } as unknown as ChatService;

    const authService = {
      currentRole: () => 'ADMIN',
      isAdmin: () => true,
    } as unknown as AuthService;

    const sanitizer = {
      bypassSecurityTrustResourceUrl: (value: string) => value,
    } as unknown as DomSanitizer;

    const component = new ChatbotComponent(chatService, authService, sanitizer);
    return {
      component,
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
});
