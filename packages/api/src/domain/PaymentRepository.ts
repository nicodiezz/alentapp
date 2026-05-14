import { PaymentDTO, CreatePaymentRequest } from '@alentapp/shared';

export interface PaymentRepository {
  create(payment: CreatePaymentRequest): Promise<PaymentDTO>;
}
