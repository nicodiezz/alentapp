import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetEquipmentLoansUseCase } from './GetEquipmentLoansUseCase.js';
import { EquipmentLoanRepository } from '../domain/EquipmentLoanRepository.js';

describe('GetEquipmentLoansUseCase', () => {
    const mockEquipmentLoanRepo = {
        findAll: vi.fn(),
    } as unknown as EquipmentLoanRepository;

    const useCase = new GetEquipmentLoansUseCase(mockEquipmentLoanRepo);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe retornar la lista de préstamos de equipamiento', async () => {
        const mockLoans = [
            { id: '1', item_name: 'Raqueta' },
            { id: '2', item_name: 'Pelota' },
        ];
        vi.mocked(mockEquipmentLoanRepo.findAll).mockResolvedValueOnce(mockLoans as any);

        const result = await useCase.execute();
        expect(result).toEqual(mockLoans);
        expect(mockEquipmentLoanRepo.findAll).toHaveBeenCalledOnce();
    });
});
