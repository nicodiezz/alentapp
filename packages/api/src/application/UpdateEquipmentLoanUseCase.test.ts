import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateEquipmentLoanUseCase } from './UpdateEquipmentLoanUseCase.js';
import { EquipmentLoanRepository } from '../domain/EquipmentLoanRepository.js';
import { EquipmentLoanValidator } from '../domain/services/EquipmentLoanValidator.js';
import { UpdateEquipmentLoanRequest, EquipmentLoanDTO } from '@alentapp/shared';

describe('UpdateEquipmentLoanUseCase', () => {
    const mockEquipmentLoanRepo = {
        findById: vi.fn(),
        update: vi.fn(),
    } as unknown as EquipmentLoanRepository;

    const mockEquipmentLoanValidator = {
        validateStatus: vi.fn(),
        validateDateFormat: vi.fn(),
        validateLoanDates: vi.fn(),
        validateMemberCanBorrow: vi.fn(),
    } as unknown as EquipmentLoanValidator;

    const useCase = new UpdateEquipmentLoanUseCase(mockEquipmentLoanRepo, mockEquipmentLoanValidator);

    const mockExistingLoan: EquipmentLoanDTO = {
        id: 'uuid-loan-1',
        item_name: 'Raqueta',
        status: 'Loaned',
        loan_date: '2026-05-01',
        due_date: '2026-05-15',
        member_id: 'uuid-member-1',
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(mockEquipmentLoanRepo.findById).mockResolvedValue(mockExistingLoan);
    });

    it('debe lanzar error si el préstamo no existe', async () => {
        vi.mocked(mockEquipmentLoanRepo.findById).mockResolvedValueOnce(null);
        await expect(useCase.execute('uuid-no', {})).rejects.toThrow('El préstamo no existe');
        expect(mockEquipmentLoanRepo.update).not.toHaveBeenCalled();
    });

    it('debe validar el estado si es enviado', async () => {
        const updateData: UpdateEquipmentLoanRequest = { status: 'Returned' };
        vi.mocked(mockEquipmentLoanRepo.update).mockResolvedValueOnce({ ...mockExistingLoan, ...updateData });

        await useCase.execute('uuid-loan-1', updateData);

        expect(mockEquipmentLoanValidator.validateStatus).toHaveBeenCalledWith('Returned');
        expect(mockEquipmentLoanRepo.update).toHaveBeenCalledWith('uuid-loan-1', expect.objectContaining({
            status: 'Returned',
        }));
    });

    it('debe validar que el socio pueda tomar préstamos si se cambia el member_id', async () => {
        const updateData: UpdateEquipmentLoanRequest = { member_id: 'uuid-member-2' };
        vi.mocked(mockEquipmentLoanRepo.update).mockResolvedValueOnce({ ...mockExistingLoan, ...updateData });

        await useCase.execute('uuid-loan-1', updateData);

        expect(mockEquipmentLoanValidator.validateMemberCanBorrow).toHaveBeenCalledWith('uuid-member-2');
    });

    it('debe validar formato y orden de fechas si se envía solo due_date, usando loan_date original', async () => {
        const updateData: UpdateEquipmentLoanRequest = { due_date: '2026-06-01' };
        vi.mocked(mockEquipmentLoanRepo.update).mockResolvedValueOnce({ ...mockExistingLoan, ...updateData });

        await useCase.execute('uuid-loan-1', updateData);

        expect(mockEquipmentLoanValidator.validateDateFormat).toHaveBeenCalledWith('2026-06-01');
        expect(mockEquipmentLoanValidator.validateLoanDates).toHaveBeenCalledWith(
            mockExistingLoan.loan_date,
            '2026-06-01',
        );
    });

    it('debe validar formato y orden de fechas si se envía solo loan_date, usando due_date original', async () => {
        const updateData: UpdateEquipmentLoanRequest = { loan_date: '2026-04-01' };
        vi.mocked(mockEquipmentLoanRepo.update).mockResolvedValueOnce({ ...mockExistingLoan, ...updateData });

        await useCase.execute('uuid-loan-1', updateData);

        expect(mockEquipmentLoanValidator.validateDateFormat).toHaveBeenCalledWith('2026-04-01');
        expect(mockEquipmentLoanValidator.validateLoanDates).toHaveBeenCalledWith(
            '2026-04-01',
            mockExistingLoan.due_date,
        );
    });

    it('NO debe validar fechas si no se envían loan_date ni due_date', async () => {
        const updateData: UpdateEquipmentLoanRequest = { item_name: 'Pelota' };
        vi.mocked(mockEquipmentLoanRepo.update).mockResolvedValueOnce({ ...mockExistingLoan, ...updateData });

        await useCase.execute('uuid-loan-1', updateData);

        expect(mockEquipmentLoanValidator.validateDateFormat).not.toHaveBeenCalled();
        expect(mockEquipmentLoanValidator.validateLoanDates).not.toHaveBeenCalled();
    });

    it('debe actualizar exitosamente y retornar los nuevos datos', async () => {
        const updateData: UpdateEquipmentLoanRequest = { item_name: 'Pelota nueva', status: 'Damaged' };
        vi.mocked(mockEquipmentLoanRepo.update).mockResolvedValueOnce({ ...mockExistingLoan, ...updateData });

        const result = await useCase.execute('uuid-loan-1', updateData);

        expect(mockEquipmentLoanRepo.update).toHaveBeenCalledWith('uuid-loan-1', expect.objectContaining({
            item_name: 'Pelota nueva',
            status: 'Damaged',
        }));
        expect(result.item_name).toBe('Pelota nueva');
        expect(result.status).toBe('Damaged');
    });
});
