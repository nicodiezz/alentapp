import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetSportsUseCase } from './GetSportsUseCase.js';
import { SportRepository } from '../domain/SportRepository.js';

describe('GetSportsUseCase', () => {
    const mockSportRepo = {
        findAll: vi.fn(),
    } as unknown as SportRepository;

    const useCase = new GetSportsUseCase(mockSportRepo);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe retornar la lista de deportes', async () => {
        const mockSports = [
            { id: 'sport-1', name: 'Natación' },
            { id: 'sport-2', name: 'Tenis' },
        ];
        vi.mocked(mockSportRepo.findAll).mockResolvedValueOnce(mockSports as any);

        const result = await useCase.execute();

        expect(result).toEqual(mockSports);
        expect(mockSportRepo.findAll).toHaveBeenCalledOnce();
    });

    it('debe retornar una lista vacía si no hay deportes cargados', async () => {
        vi.mocked(mockSportRepo.findAll).mockResolvedValueOnce([]);

        const result = await useCase.execute();

        expect(result).toEqual([]);
        expect(mockSportRepo.findAll).toHaveBeenCalledOnce();
    });
});
