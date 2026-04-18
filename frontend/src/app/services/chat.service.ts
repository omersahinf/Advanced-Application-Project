import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ChatRequest, ChatResponse } from '../models/product.model';
import { AuthService } from './auth.service';

export interface StreamStepEvent {
  step: string;
  status: 'done' | 'error';
  icon?: string;
  label?: string;
  payload?: Record<string, any>;
}

export interface StreamHandlers {
  onStep: (event: StreamStepEvent) => void;
  onFinal: (payload: Record<string, any>) => void;
  onError: (message: string) => void;
}

@Injectable({ providedIn: 'root' })
export class ChatService {

  private readonly API = '/api/chat/ask';
  private readonly STREAM_API = '/api/chat/stream';
  private sessionId = crypto.randomUUID();

  constructor(private http: HttpClient, private auth: AuthService) {}

  sendMessage(message: string) {
    return this.http.post<ChatResponse>(this.API, { message, sessionId: this.sessionId } as any);
  }

  /**
   * Streams step-by-step execution events from the backend via SSE.
   * Returns an AbortController so the caller can cancel in-flight streams.
   */
  streamMessage(message: string, handlers: StreamHandlers): AbortController {
    const controller = new AbortController();
    const token = this.auth.getToken();

    fetch(this.STREAM_API, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ message, sessionId: this.sessionId }),
    })
      .then(async (response) => {
        if (!response.ok || !response.body) {
          handlers.onError(`Stream failed: HTTP ${response.status}`);
          return;
        }
        await this.consumeSse(response.body, handlers);
      })
      .catch((err: unknown) => {
        if ((err as any)?.name === 'AbortError') return;
        handlers.onError(err instanceof Error ? err.message : 'Network error');
      });

    return controller;
  }

  private async consumeSse(body: ReadableStream<Uint8Array>, handlers: StreamHandlers): Promise<void> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE frames are separated by a blank line
      let sepIdx: number;
      while ((sepIdx = buffer.indexOf('\n\n')) !== -1) {
        const frame = buffer.slice(0, sepIdx);
        buffer = buffer.slice(sepIdx + 2);
        this.dispatchFrame(frame, handlers);
      }
    }
  }

  private dispatchFrame(frame: string, handlers: StreamHandlers): void {
    let eventName = 'message';
    const dataLines: string[] = [];
    for (const line of frame.split('\n')) {
      if (line.startsWith('event:')) eventName = line.slice(6).trim();
      else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
    }
    if (dataLines.length === 0) return;
    let parsed: any;
    try {
      parsed = JSON.parse(dataLines.join('\n'));
    } catch {
      return;
    }
    if (eventName === 'final') {
      handlers.onFinal(parsed.payload ?? parsed);
    } else {
      handlers.onStep(parsed as StreamStepEvent);
    }
  }
}
