import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetDisciplinesUseCase } from './GetDisciplinesUseCase.js';
import { DisciplineRepository } from '../domain/DisciplineRepository.js';

describe('GetDisciplinesUseCase', () => {
    const mockDisciplineRepo = {
        findAll: vi.fn(),
    } as unknown as DisciplineRepository;

    const useCase = new GetDisciplinesUseCase(mockDisciplineRepo);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe retornar la lista de suspensiones', async () => {
        const mockDisciplines = [{ id: '1', reason: 'A' }, { id: '2', reason: 'B' }];
        vi.mocked(mockDisciplineRepo.findAll).mockResolvedValueOnce(mockDisciplines as any);
        
        const result = await useCase.execute();
        expect(result).toEqual(mockDisciplines);
        expect(mockDisciplineRepo.findAll).toHaveBeenCalledOnce();
    });

    it('debe propagar el error si el repositorio falla', async () => {
        vi.mocked(mockDisciplineRepo.findAll).mockRejectedValueOnce(new Error('Error interno, reintente más tarde'));

        await expect(useCase.execute()).rejects.toThrow('Error interno, reintente más tarde');
    });
});
