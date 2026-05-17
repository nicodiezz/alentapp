import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client/client.js';
import { PaymentRepository } from '../domain/PaymentRepository.js';
import { PaymentDTO, CreatePaymentRequest, UpdatePaymentRequest } from '@alentapp/shared';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
}

const prisma = new PrismaClient({
    adapter: new PrismaPg(process.env.DATABASE_URL),
});

type DBPayment = {
    id: string;
    member_id: string;
    amount: number;
    month: number;
    year: number;
    payment_date: Date | null;
    status: 'Pending' | 'Paid' | 'Canceled';
    created_at: Date;
    due_date: Date;
};

export class PostgresPaymentRepository implements PaymentRepository {
    async create(data: CreatePaymentRequest): Promise<PaymentDTO> {
        const payment = await prisma.payment.create({
            data: {
                member_id: data.member_id,
                amount: data.amount,
                month: data.month,
                year: data.year,
                payment_date: data.payment_date ? new Date(data.payment_date) : null,
                status: data.status,
                due_date: new Date(data.due_date),
            },
        });

        return this.mapToDTO(payment);
    }

    async findAll(): Promise<PaymentDTO[]> {
        const payments = await prisma.payment.findMany();
        return payments.map(this.mapToDTO);
    }

    async findById(id: string): Promise<PaymentDTO | null> {
        const payment = await prisma.payment.findUnique({ where: { id } });
        return payment ? this.mapToDTO(payment) : null;
    }

    async update(id: string, payment: UpdatePaymentRequest): Promise<PaymentDTO> {
        const updatedPayment = await prisma.payment.update({
            where: { id },
            data: {
                member_id: payment.member_id,
                amount: payment.amount,
                month: payment.month,
                year: payment.year,
                payment_date: payment.payment_date !== undefined
                    ? (payment.payment_date ? new Date(payment.payment_date) : null)
                    : undefined,
                status: payment.status,
                due_date: payment.due_date ? new Date(payment.due_date) : undefined,
            },
        });
        return this.mapToDTO(updatedPayment);
    }

    async cancel(id: string): Promise<PaymentDTO> {
        const updatedPayment = await prisma.payment.update({
            where: { id },
            data: {
                status: 'Canceled',
            },
        });
        return this.mapToDTO(updatedPayment);
    }

    private mapToDTO(payment: DBPayment): PaymentDTO {
        return {
            id: payment.id,
            member_id: payment.member_id,
            amount: payment.amount,
            month: payment.month,
            year: payment.year,
            payment_date: payment.payment_date?.toISOString().split('T')[0],
            status: payment.status,
            due_date: payment.due_date.toISOString().split('T')[0],
            created_at: payment.created_at.toISOString(),
        };
    }
}
