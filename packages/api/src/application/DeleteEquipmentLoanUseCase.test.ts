import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeleteEquipmentLoanUseCase } from './DeleteEquipmentLoanUseCase.js';
import { EquipmentLoanRepository } from '../domain/EquipmentLoanRepository.js';
import { EquipmentLoanDTO } from '@alentapp/shared';

describe('DeleteEquipmentLoanUseCase', () => {
    const mockEquipmentLoanRepo: EquipmentLoanRepository = {
        create: vi.fn(),
        findById: vi.fn(),
        update: vi.fn(),
        findAll: vi.fn(),
        delete: vi.fn(),
    };

    const useCase = new DeleteEquipmentLoanUseCase(mockEquipmentLoanRepo);

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
    });

    it('debe lanzar error si el préstamo de equipamiento no existe', async () => {
        vi.mocked(mockEquipmentLoanRepo.findById).mockResolvedValueOnce(null);
        await expect(useCase.execute('uuid-999')).rejects.toThrow('El préstamo de equipamiento no existe');
        expect(mockEquipmentLoanRepo.delete).not.toHaveBeenCalled();
    });

    it('debe eliminar el préstamo si existe', async () => {
        vi.mocked(mockEquipmentLoanRepo.findById).mockResolvedValueOnce(mockExistingLoan);
        await useCase.execute('uuid-loan-1');
        expect(mockEquipmentLoanRepo.delete).toHaveBeenCalledWith('uuid-loan-1');
    });
});
