import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeleteSportUseCase } from './DeleteSportUseCase.js';
import { SportRepository } from '../domain/SportRepository.js';
import { SportDTO } from '@alentapp/shared';

describe('DeleteSportUseCase', () => {
    const existingSport: SportDTO = {
        id: 'sport-1',
        name: 'Natación',
        description: 'Clases en pileta cubierta',
        max_capacity: 20,
        additional_price: 1500,
        requires_medical_certificate: true,
    };

    const mockSportRepo: SportRepository = {
        create: vi.fn(),
        findAll: vi.fn(),
        findById: vi.fn(),
        findByName: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    };

    const useCase = new DeleteSportUseCase(mockSportRepo);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe lanzar error si el deporte no existe', async () => {
        vi.mocked(mockSportRepo.findById).mockResolvedValueOnce(null);

        await expect(useCase.execute('sport-no')).rejects.toThrow('El deporte no existe');
        expect(mockSportRepo.delete).not.toHaveBeenCalled();
    });

    it('debe eliminar el deporte si existe', async () => {
        vi.mocked(mockSportRepo.findById).mockResolvedValueOnce(existingSport);

        await useCase.execute('sport-1');

        expect(mockSportRepo.findById).toHaveBeenCalledWith('sport-1');
        expect(mockSportRepo.delete).toHaveBeenCalledWith('sport-1');
    });
});
