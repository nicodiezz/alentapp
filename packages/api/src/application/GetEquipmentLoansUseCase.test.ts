import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetEquipmentLoansUseCase } from './GetEquipmentLoansUseCase.js';
import { EquipmentLoanRepository } from '../domain/EquipmentLoanRepository.js';
import { EquipmentLoanDTO } from '@alentapp/shared';

describe('GetEquipmentLoansUseCase', () => {
    const mockEquipmentLoanRepo: EquipmentLoanRepository = {
        create: vi.fn(),
        findById: vi.fn(),
        update: vi.fn(),
        findAll: vi.fn(),
        delete: vi.fn(),
    };

    const useCase = new GetEquipmentLoansUseCase(mockEquipmentLoanRepo);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe retornar la lista de préstamos de equipamiento', async () => {
        const mockLoans: EquipmentLoanDTO[] = [
            {
                id: '1',
                item_name: 'Raqueta',
                status: 'Loaned',
                loan_date: '2026-05-01',
                due_date: '2026-05-15',
                member_id: 'uuid-member-1',
            },
            {
                id: '2',
                item_name: 'Pelota',
                status: 'Returned',
                loan_date: '2026-04-01',
                due_date: '2026-04-15',
                member_id: 'uuid-member-2',
            },
        ];
        vi.mocked(mockEquipmentLoanRepo.findAll).mockResolvedValueOnce(mockLoans);

        const result = await useCase.execute();
        expect(result).toEqual(mockLoans);
        expect(mockEquipmentLoanRepo.findAll).toHaveBeenCalledOnce();
    });
});
