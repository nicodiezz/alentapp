import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreatePaymentUseCase } from './NewPaymentUseCase.js';
import { PaymentRepository } from '../domain/PaymentRepository.js';
import { PaymentValidator } from '../domain/services/PaymentValidator.js';
import { MemberRepository } from '../domain/MemberRepository.js';
import { CreatePaymentRequest } from '@alentapp/shared';

describe('CreatePaymentUseCase', () => {

    const mockPaymentRepository = {
        create: vi.fn(),
    } as Partial<PaymentRepository> as PaymentRepository;

    const mockMemberRepository = {
        findById: vi.fn(),
    } as Partial<MemberRepository> as MemberRepository;

    const mockPaymentValidator = {
        validateAmount: vi.fn(),
        validateMonth: vi.fn(),
        validateYear: vi.fn(),
        validateDueDate: vi.fn(),
        validatePaymentDate: vi.fn(),
        validateStatus: vi.fn(),
    } as Partial<PaymentValidator> as PaymentValidator;

    const useCase = new CreatePaymentUseCase(mockPaymentRepository, mockPaymentValidator, mockMemberRepository);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe crear un pago exitosamente cuando el miembro existe y pasa todas las validaciones', async () => {
        const mockRequest: CreatePaymentRequest = {
            member_id: 'uuid-member-1',
            amount: 2500,
            month: 6,
            year: 2026,
            status: 'Pending',
            due_date: '2026-06-30'
        };

        vi.mocked(mockMemberRepository.findById).mockResolvedValueOnce({
            id: 'uuid-member-1',
            dni: '12345678',
            name: 'Nicolas Gonzales',
            email: 'nicolas@gmail.com',
            birthdate: '1995-05-15',
            category: 'Pleno',
            status: 'Activo',
            created_at: '2026-04-20T00:00:00.000Z'
        });

        vi.mocked(mockPaymentRepository.create).mockResolvedValueOnce({
            id: 'uuid-payment-1',
            ...mockRequest,
            payment_date: undefined,
            created_at: '2026-04-20T00:00:00.000Z'
        });

        const result = await useCase.execute(mockRequest);

        expect(mockPaymentValidator.validateAmount).toHaveBeenCalledWith(mockRequest.amount);
        expect(mockPaymentValidator.validateMonth).toHaveBeenCalledWith(mockRequest.month);
        expect(mockPaymentValidator.validateYear).toHaveBeenCalledWith(mockRequest.year);
        expect(mockPaymentValidator.validateDueDate).toHaveBeenCalledWith(mockRequest.due_date);
        expect(mockPaymentValidator.validatePaymentDate).toHaveBeenCalledWith('', mockRequest.status);
        expect(mockPaymentValidator.validateStatus).toHaveBeenCalledWith(mockRequest.status);

        expect(mockMemberRepository.findById).toHaveBeenCalledWith(mockRequest.member_id);

        expect(mockPaymentRepository.create).toHaveBeenCalledWith({
            member_id: mockRequest.member_id,
            amount: mockRequest.amount,
            month: mockRequest.month,
            year: mockRequest.year,
            payment_date: mockRequest.payment_date,
            status: mockRequest.status,
            due_date: mockRequest.due_date,
        });

        expect(result.id).toBe('uuid-payment-1');
    });

    it('debe propagar el error si el miembro no existe', async () => {
        const mockRequest: CreatePaymentRequest = {
            member_id: 'uuid-no-existe',
            amount: 2500,
            month: 6,
            year: 2026,
            status: 'Pending',
            due_date: '2026-06-30'
        };

        vi.mocked(mockMemberRepository.findById).mockResolvedValueOnce(null);

        await expect(useCase.execute(mockRequest)).rejects.toThrow('No existe un miembro con ese ID');

        expect(mockPaymentRepository.create).not.toHaveBeenCalled();
    });

    it('debe propagar el error si alguna validación de negocio falla', async () => {
        const mockRequest: CreatePaymentRequest = {
            member_id: 'uuid-member-1',
            amount: -100,
            month: 6,
            year: 2026,
            status: 'Pending',
            due_date: '2026-06-30'
        };

        vi.mocked(mockPaymentValidator.validateAmount).mockImplementationOnce(() => {
            throw new Error('Monto inválido');
        });

        await expect(useCase.execute(mockRequest)).rejects.toThrow('Monto inválido');

        expect(mockMemberRepository.findById).not.toHaveBeenCalled();
        expect(mockPaymentRepository.create).not.toHaveBeenCalled();
    });
});
