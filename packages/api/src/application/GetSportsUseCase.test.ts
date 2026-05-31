import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetSportsUseCase } from './GetSportsUseCase.js';
import { SportRepository } from '../domain/SportRepository.js';
import { SportDTO } from '@alentapp/shared';

describe('GetSportsUseCase', () => {
    const mockSportRepo: SportRepository = {
        create: vi.fn(),
        findAll: vi.fn(),
        findById: vi.fn(),
        findByName: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    };

    const useCase = new GetSportsUseCase(mockSportRepo);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe retornar la lista de deportes', async () => {
        const mockSports: SportDTO[] = [
            {
                id: 'sport-1',
                name: 'Natación',
                description: 'Clases en pileta cubierta',
                max_capacity: 20,
                additional_price: 1500,
                requires_medical_certificate: true,
            },
            {
                id: 'sport-2',
                name: 'Tenis',
                description: 'Entrenamiento en cancha',
                max_capacity: 12,
                additional_price: 2000,
                requires_medical_certificate: false,
            },
        ];
        vi.mocked(mockSportRepo.findAll).mockResolvedValueOnce(mockSports);

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
