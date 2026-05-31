import { PaymentRepository } from '../domain/PaymentRepository.js';
import { PaymentValidator } from '../domain/services/PaymentValidator.js';
import { PaymentDTO, UpdatePaymentRequest, CreatePaymentStatus } from '@alentapp/shared';
import { MemberRepository } from '../domain/MemberRepository.js';

export class UpdatePaymentUseCase {
    constructor(
        private readonly paymentRepo: PaymentRepository,
        private readonly memberRepo: MemberRepository,
        private readonly paymentValidator: PaymentValidator
    ) { }

    async execute(id: string, data: UpdatePaymentRequest): Promise<PaymentDTO> {
        const existingPayment = await this.paymentRepo.findById(id);
        if (!existingPayment) {
            throw new Error('No existe un pago con ese ID');
        }

        if (data.member_id) {
            const existingMember = await this.memberRepo.findById(data.member_id);
            if (!existingMember) {
                throw new Error('No existe un miembro con ese ID');
            }
        }

        if (data.amount) {
            this.paymentValidator.validateAmount(data.amount);
        }

        if (data.month) {
            this.paymentValidator.validateMonth(data.month);
        }

        if (data.year) {
            this.paymentValidator.validateYear(data.year);
        }

        if (data.due_date) {
            this.paymentValidator.validateDueDate(data.due_date);
        }

        //Obtengo el estado y la fecha de pago actuales
        const currentStatus = (data.status ?? existingPayment.status) as CreatePaymentStatus;
        const currentPaymentDate = data.payment_date ?? existingPayment.payment_date ?? '';

        //Valido que la fecha de pago sea correcta
        if (data.payment_date !== undefined || data.status !== undefined) {
            this.paymentValidator.validatePaymentDate(currentPaymentDate, currentStatus);
        }

        if (data.status) {
            this.paymentValidator.validateStatus(data.status);
        }

        return this.paymentRepo.update(id, data);
    }
}
