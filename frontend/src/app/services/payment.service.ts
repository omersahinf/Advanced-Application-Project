import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { PaymentIntentRequest, PaymentResponse } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class PaymentService {
  constructor(private http: HttpClient) {}

  createPaymentIntent(req: PaymentIntentRequest) {
    return this.http.post<PaymentResponse>('/api/payments/create-intent', req);
  }

  confirmPayment(paymentIntentId: string) {
    return this.http.post<PaymentResponse>('/api/payments/confirm', { paymentIntentId });
  }
}
