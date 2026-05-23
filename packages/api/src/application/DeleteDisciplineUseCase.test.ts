import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeleteDisciplineUseCase } from './DeleteDisciplineUseCase.js';
import { DisciplineRepository } from '../domain/DisciplineRepository.js';

describe('DeleteDisciplineUseCase', () => {
    const mockDisciplineRepo = {
        findById: vi.fn(),
        delete: vi.fn(),
    } as unknown as DisciplineRepository;

    const useCase = new DeleteDisciplineUseCase(mockDisciplineRepo);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe lanzar error si la suspensión no existe', async () => {
        vi.mocked(mockDisciplineRepo.findById).mockResolvedValueOnce(null);
        await expect(useCase.execute('uuid-999')).rejects.toThrow('La suspensión no existe');
        expect(mockDisciplineRepo.delete).not.toHaveBeenCalled();
    });

    it('debe eliminar la suspensión si existe', async () => {
        vi.mocked(mockDisciplineRepo.findById).mockResolvedValueOnce({ id: 'uuid-1' } as any);
        await useCase.execute('uuid-1');
        expect(mockDisciplineRepo.delete).toHaveBeenCalledWith('uuid-1');
    });
});
