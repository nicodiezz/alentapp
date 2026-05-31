import { PaymentRepository } from '../domain/PaymentRepository.js';
import { PaymentValidator } from '../domain/services/PaymentValidator.js';
import { PaymentDTO } from '@alentapp/shared';

export class CancelPaymentUseCase {
    constructor(
        private readonly paymentRepo: PaymentRepository,
        private readonly paymentValidator: PaymentValidator,
    ) { }

    async execute(id: string): Promise<PaymentDTO> {
        const existingPayment = await this.paymentRepo.findById(id);
        if (!existingPayment) {
            throw new Error('No existe un pago con ese ID');
        }

        this.paymentValidator.cancelPayment(existingPayment.status);

        return this.paymentRepo.cancel(id);
    }
}
