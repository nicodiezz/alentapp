import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetPaymentsUseCase } from './GetPaymentsUseCase.js';
import { PaymentRepository } from '../domain/PaymentRepository.js';
import { PaymentDTO } from '@alentapp/shared';

describe('GetPaymentsUseCase', () => {
    const mockPaymentRepo = {
        findAll: vi.fn(),
    } as Partial<PaymentRepository> as PaymentRepository;

    const useCase = new GetPaymentsUseCase(mockPaymentRepo);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe retornar la lista de pagos', async () => {
        const mockPayments: PaymentDTO[] = [
            {
                id: 'uuid-payment-1',
                member_id: 'uuid-member-1',
                amount: 1500,
                month: 5,
                year: 2026,
                status: 'Pending',
                due_date: '2026-06-30',
                created_at: '2026-04-20T00:00:00.000Z',
            },
            {
                id: 'uuid-payment-2',
                member_id: 'uuid-member-1',
                amount: 2000,
                month: 6,
                year: 2026,
                status: 'Paid',
                due_date: '2026-07-31',
                payment_date: '2026-05-29T20:00:00.000Z',
                created_at: '2026-04-20T00:00:00.000Z',
            }
        ];

        vi.mocked(mockPaymentRepo.findAll).mockResolvedValueOnce(mockPayments);

        const result = await useCase.execute();

        expect(result).toEqual(mockPayments);
        expect(mockPaymentRepo.findAll).toHaveBeenCalledOnce();
    });
});
