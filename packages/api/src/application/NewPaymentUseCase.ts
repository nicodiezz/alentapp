import { PaymentRepository } from '../domain/PaymentRepository.js';
import { PaymentValidator } from '../domain/services/PaymentValidator.js';
import { PaymentDTO, CreatePaymentRequest } from '@alentapp/shared';
import { MemberRepository } from "../domain/MemberRepository.js"; 

export class CreatePaymentUseCase {
    constructor(
        private readonly paymentRepository: PaymentRepository,
        private readonly paymentValidator: PaymentValidator,
        private readonly memberRepository: MemberRepository,
    ) { }

    async execute(data: CreatePaymentRequest): Promise<PaymentDTO> {
        this.paymentValidator.validateAmount(data.amount);
        this.paymentValidator.validateMonth(data.month);
        this.paymentValidator.validateYear(data.year);
        this.paymentValidator.validateDueDate(data.due_date);
        if (data.payment_date) {
            this.paymentValidator.validatePaymentDate(data.payment_date, data.status);
        }
        this.paymentValidator.validateStatus(data.status);

        const member = await this.memberRepository.findById(data.member_id);
        if (!member) {
            throw new Error('No existe un miembro con ese ID');
        }

        const newPayment = await this.paymentRepository.create({
            member_id: data.member_id,
            amount: data.amount,
            month: data.month,
            year: data.year,
            payment_date: data.payment_date,
            status: data.status,
            due_date: data.due_date,
        });

        return newPayment;
    }
}
