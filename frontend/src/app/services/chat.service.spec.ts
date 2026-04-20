import { describe, expect, it, vi, afterEach } from 'vitest';
import type { HttpClient } from '@angular/common/http';
import type { AuthService } from './auth.service';
import { ChatService, type StreamHandlers } from './chat.service';

function makeService() {
  const http = { post: vi.fn() } as unknown as HttpClient;
  const auth = {} as unknown as AuthService;
  return new ChatService(http, auth);
}

function makeHandlers(): StreamHandlers {
  return {
    onStep: vi.fn(),
    onFinal: vi.fn(),
    onError: vi.fn(),
  };
}

function makeStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
      controller.close();
    },
  });
}

async function flushAsyncWork() {
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('ChatService SSE handling', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('parses chunked step and nested final SSE frames', async () => {
    const service = makeService();
    const handlers = makeHandlers();

    await (service as any).consumeSse(
      makeStream([
        'event: step\ndata: {"step":"guard',
        'rails","status":"done","payload":{"is_in_scope":true}}\n\n',
        'event: final\ndata: {"payload":{"answer":"Done"}}\n\n',
      ]),
      handlers,
    );

    expect(handlers.onStep).toHaveBeenCalledWith({
      step: 'guardrails',
      status: 'done',
      payload: { is_in_scope: true },
    });
    expect(handlers.onFinal).toHaveBeenCalledWith({ answer: 'Done' });
  });

  it('uses the top-level final object when payload is absent', () => {
    const service = makeService();
    const handlers = makeHandlers();

    (service as any).dispatchFrame('event: final\ndata: {"answer":"Top level"}', handlers);

    expect(handlers.onFinal).toHaveBeenCalledWith({ answer: 'Top level' });
  });

  it('ignores invalid JSON frames', () => {
    const service = makeService();
    const handlers = makeHandlers();

    (service as any).dispatchFrame('event: step\ndata: {"step":', handlers);

    expect(handlers.onStep).not.toHaveBeenCalled();
    expect(handlers.onFinal).not.toHaveBeenCalled();
    expect(handlers.onError).not.toHaveBeenCalled();
  });

  it('reports HTTP failures from streamMessage', async () => {
    const service = makeService();
    const handlers = makeHandlers();

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 503, body: null } as Response),
    );

    service.streamMessage('Show revenue', handlers);
    await flushAsyncWork();

    expect(handlers.onError).toHaveBeenCalledWith('Stream failed: HTTP 503');
  });

  it('reports network failures and ignores abort errors', async () => {
    const service = makeService();
    const handlers = makeHandlers();
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('socket hang up'))
      .mockRejectedValueOnce(Object.assign(new Error('aborted'), { name: 'AbortError' }));

    vi.stubGlobal('fetch', fetchMock);

    service.streamMessage('First call', handlers);
    await flushAsyncWork();
    service.streamMessage('Second call', handlers);
    await flushAsyncWork();

    expect(handlers.onError).toHaveBeenCalledTimes(1);
    expect(handlers.onError).toHaveBeenCalledWith('socket hang up');
  });
});
