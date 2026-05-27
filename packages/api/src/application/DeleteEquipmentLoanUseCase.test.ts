import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeleteEquipmentLoanUseCase } from './DeleteEquipmentLoanUseCase.js';
import { EquipmentLoanRepository } from '../domain/EquipmentLoanRepository.js';

describe('DeleteEquipmentLoanUseCase', () => {
    const mockEquipmentLoanRepo = {
        findById: vi.fn(),
        delete: vi.fn(),
    } as unknown as EquipmentLoanRepository;

    const useCase = new DeleteEquipmentLoanUseCase(mockEquipmentLoanRepo);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe lanzar error si el préstamo de equipamiento no existe', async () => {
        vi.mocked(mockEquipmentLoanRepo.findById).mockResolvedValueOnce(null);
        await expect(useCase.execute('uuid-999')).rejects.toThrow('El préstamo de equipamiento no existe');
        expect(mockEquipmentLoanRepo.delete).not.toHaveBeenCalled();
    });

    it('debe eliminar el préstamo si existe', async () => {
        vi.mocked(mockEquipmentLoanRepo.findById).mockResolvedValueOnce({ id: 'uuid-loan-1' } as any);
        await useCase.execute('uuid-loan-1');
        expect(mockEquipmentLoanRepo.delete).toHaveBeenCalledWith('uuid-loan-1');
    });
});
