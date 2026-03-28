import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ChatRequest, ChatResponse } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class ChatService {

  private readonly API = '/api/chat/ask';
  private sessionId = crypto.randomUUID();

  constructor(private http: HttpClient) {}

  sendMessage(message: string) {
    return this.http.post<ChatResponse>(this.API, { message, sessionId: this.sessionId } as any);
  }
}
