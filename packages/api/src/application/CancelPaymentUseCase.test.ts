import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CancelPaymentUseCase } from './CancelPaymentUseCase.js';
import { PaymentRepository } from '../domain/PaymentRepository.js';
import { PaymentValidator } from '../domain/services/PaymentValidator.js';
import { PaymentDTO } from '@alentapp/shared';

describe('CancelPaymentUseCase', () => {

    const mockPaymentRepository = {
        findById: vi.fn(),
        cancel: vi.fn(),
    } as Partial<PaymentRepository> as PaymentRepository;

    const mockPaymentValidator = {
        cancelPayment: vi.fn(),
    } as Partial<PaymentValidator> as PaymentValidator;


    const useCase = new CancelPaymentUseCase(mockPaymentRepository, mockPaymentValidator);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe cancelar el pago si existe', async () => {
        const mockExistingPayment = {
            id: 'uuid-payment-1',
            status: 'Pending',
        } as Partial<PaymentDTO> as PaymentDTO;

        const mockCanceledPayment = {
            id: 'uuid-payment-1',
            status: 'Canceled',
        } as Partial<PaymentDTO> as PaymentDTO;

        vi.mocked(mockPaymentRepository.findById).mockResolvedValueOnce(mockExistingPayment);
        vi.mocked(mockPaymentRepository.cancel).mockResolvedValueOnce(mockCanceledPayment);

        const result = await useCase.execute('uuid-payment-1');

        expect(mockPaymentValidator.cancelPayment).toHaveBeenCalledWith('Pending');

        expect(mockPaymentRepository.cancel).toHaveBeenCalledWith('uuid-payment-1');
        expect(result.status).toBe('Canceled');
    });

    it('debe propagar el error si el pago no existe', async () => {
        vi.mocked(mockPaymentRepository.findById).mockResolvedValueOnce(null);

        await expect(useCase.execute('uuid-no-existe')).rejects.toThrow('No existe un pago con ese ID');

        expect(mockPaymentRepository.cancel).not.toHaveBeenCalled();
    });

    it('debe propagar el error si la validación de cancelación falla', async () => {
        const mockExistingPayment = {
            id: 'uuid-payment-1',
            status: 'Canceled',
        } as Partial<PaymentDTO> as PaymentDTO;

        vi.mocked(mockPaymentRepository.findById).mockResolvedValueOnce(mockExistingPayment);
        vi.mocked(mockPaymentValidator.cancelPayment).mockImplementationOnce(() => {
            throw new Error('El pago ya se encuentra cancelado');
        });

        await expect(useCase.execute('uuid-payment-1')).rejects.toThrow('El pago ya se encuentra cancelado');

        expect(mockPaymentRepository.cancel).not.toHaveBeenCalled();
    });
});
