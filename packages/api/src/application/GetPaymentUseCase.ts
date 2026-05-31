import { PaymentRepository } from '../domain/PaymentRepository.js';
import { PaymentDTO } from '@alentapp/shared';

export class GetPaymentByIdUseCase {
    constructor(private readonly paymentRepo: PaymentRepository) { }

    async execute(id: string): Promise<PaymentDTO | null> {
        const payment = await this.paymentRepo.findById(id);
        if (!payment) {
            throw new Error('No existe un pago con ese ID');
        }
        return payment;
    }
}
