import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdatePaymentUseCase } from './UpdatePaymentUseCase.js';
import { PaymentRepository } from '../domain/PaymentRepository.js';
import { PaymentValidator } from '../domain/services/PaymentValidator.js';
import { MemberRepository } from '../domain/MemberRepository.js';
import { UpdatePaymentRequest, PaymentDTO } from '@alentapp/shared';

describe('UpdatePaymentUseCase', () => {

    const mockPaymentRepository = {
        findById: vi.fn(),
        update: vi.fn(),
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

    const useCase = new UpdatePaymentUseCase(mockPaymentRepository, mockMemberRepository, mockPaymentValidator);

    const mockExistingPayment: PaymentDTO = {
        id: 'uuid-payment-1',
        member_id: 'uuid-member-1',
        amount: 1500,
        month: 5,
        year: 2026,
        status: 'Pending',
        due_date: '2026-06-30',
        payment_date: undefined,
        created_at: '2026-04-20T00:00:00.000Z',
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(mockPaymentRepository.findById).mockResolvedValue(mockExistingPayment);
    });

    it('debe actualizar un pago exitosamente cuando el pago y el miembro existen y pasan todas las validaciones', async () => {
        const mockRequest: UpdatePaymentRequest = {
            member_id: 'uuid-member-2',
            amount: 2500,
            month: 6,
            year: 2026,
            status: 'Paid',
            due_date: '2026-07-31',
            payment_date: '2026-05-29T20:00:00.000Z'
        };

        vi.mocked(mockMemberRepository.findById).mockResolvedValueOnce({
            id: 'uuid-member-2',
            dni: '87654321',
            name: 'Nicolas Gonzales',
            email: 'nicolas@gmail.com',
            birthdate: '1995-05-15',
            category: 'Pleno',
            status: 'Activo',
            created_at: '2026-04-20T00:00:00.000Z'
        });

        const mockUpdatedPayment: PaymentDTO = {
            ...mockExistingPayment,
            ...mockRequest,
            payment_date: mockRequest.payment_date ?? undefined,
        };

        vi.mocked(mockPaymentRepository.update).mockResolvedValueOnce(mockUpdatedPayment);

        const result = await useCase.execute('uuid-payment-1', mockRequest);

        expect(mockPaymentRepository.findById).toHaveBeenCalledWith('uuid-payment-1');
        expect(mockMemberRepository.findById).toHaveBeenCalledWith('uuid-member-2');

        expect(mockPaymentValidator.validateAmount).toHaveBeenCalledWith(mockRequest.amount);
        expect(mockPaymentValidator.validateMonth).toHaveBeenCalledWith(mockRequest.month);
        expect(mockPaymentValidator.validateYear).toHaveBeenCalledWith(mockRequest.year);
        expect(mockPaymentValidator.validateDueDate).toHaveBeenCalledWith(mockRequest.due_date);
        expect(mockPaymentValidator.validatePaymentDate).toHaveBeenCalledWith(mockRequest.payment_date, mockRequest.status);
        expect(mockPaymentValidator.validateStatus).toHaveBeenCalledWith(mockRequest.status);

        expect(mockPaymentRepository.update).toHaveBeenCalledWith('uuid-payment-1', mockRequest);
        expect(result).toEqual(mockUpdatedPayment);
    });

    it('debe propagar el error si el pago a actualizar no existe', async () => {
        vi.mocked(mockPaymentRepository.findById).mockResolvedValueOnce(null);

        const mockRequest: UpdatePaymentRequest = { amount: 2000 };

        await expect(useCase.execute('uuid-no-existe', mockRequest)).rejects.toThrow('No existe un pago con ese ID');
        expect(mockPaymentRepository.update).not.toHaveBeenCalled();
    });

    it('debe propagar el error si el miembro no existe', async () => {
        const mockRequest: UpdatePaymentRequest = { member_id: 'uuid-socio-inexistente' };

        vi.mocked(mockMemberRepository.findById).mockResolvedValueOnce(null);

        await expect(useCase.execute('uuid-payment-1', mockRequest)).rejects.toThrow('No existe un miembro con ese ID');
        expect(mockPaymentRepository.update).not.toHaveBeenCalled();
    });

    it('debe rechazar la operación si se actualiza el estado a Paid y no se envía la fecha de pago', async () => {
        const mockRequest: UpdatePaymentRequest = { status: 'Paid' };

        vi.mocked(mockPaymentValidator.validatePaymentDate).mockImplementationOnce(() => {
            throw new Error('La fecha de pago es obligatoria si el estado es Pagado');
        });

        await expect(useCase.execute('uuid-payment-1', mockRequest)).rejects.toThrow('La fecha de pago es obligatoria si el estado es Pagado');

        expect(mockPaymentValidator.validatePaymentDate).toHaveBeenCalledWith('', 'Paid');
        expect(mockPaymentRepository.update).not.toHaveBeenCalled();
    });

    it('NO debe llamar a validatePaymentDate si no se actualizan ni el estado ni la fecha de pago', async () => {
        const mockRequest: UpdatePaymentRequest = { amount: 3000 };

        const mockUpdatedPayment: PaymentDTO = {
            ...mockExistingPayment,
            amount: 3000,
        };

        vi.mocked(mockPaymentRepository.update).mockResolvedValueOnce(mockUpdatedPayment);

        await useCase.execute('uuid-payment-1', mockRequest);

        expect(mockPaymentValidator.validatePaymentDate).not.toHaveBeenCalled();
    });

    it('debe propagar el error si alguna validación de negocio falla', async () => {
        const mockRequest: UpdatePaymentRequest = { amount: -50 };

        vi.mocked(mockPaymentValidator.validateAmount).mockImplementationOnce(() => {
            throw new Error('Monto inválido');
        });

        await expect(useCase.execute('uuid-payment-1', mockRequest)).rejects.toThrow('Monto inválido');
        expect(mockPaymentRepository.update).not.toHaveBeenCalled();
    });
});
