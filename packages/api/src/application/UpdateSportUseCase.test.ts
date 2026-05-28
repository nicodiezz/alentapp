import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateSportUseCase } from './UpdateSportUseCase.js';
import { SportRepository } from '../domain/SportRepository.js';
import { SportValidator } from '../domain/services/SportValidator.js';
import { SportDTO, UpdateSportRequest } from '@alentapp/shared';

describe('UpdateSportUseCase', () => {
    const mockSportRepo = {
        findById: vi.fn(),
        update: vi.fn(),
    } as unknown as SportRepository;

    const mockSportValidator = {
        validateMaxCapacity: vi.fn(),
    } as unknown as SportValidator;

    const useCase = new UpdateSportUseCase(mockSportRepo, mockSportValidator);

    const mockExistingSport: SportDTO = {
        id: 'sport-1',
        name: 'Natación',
        description: 'Clases en pileta cubierta',
        max_capacity: 20,
        additional_price: 1500,
        requires_medical_certificate: true,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(mockSportRepo.findById).mockResolvedValue(mockExistingSport);
    });

    it('debe lanzar error si el deporte no existe', async () => {
        vi.mocked(mockSportRepo.findById).mockResolvedValueOnce(null);

        await expect(useCase.execute('sport-no', {})).rejects.toThrow('El deporte no existe');
        expect(mockSportRepo.update).not.toHaveBeenCalled();
    });

    it('debe lanzar error si se intenta modificar el nombre', async () => {
        await expect(useCase.execute('sport-1', { name: 'Tenis' } as any)).rejects.toThrow(
            'El nombre del deporte no puede modificarse',
        );
        expect(mockSportRepo.update).not.toHaveBeenCalled();
    });

    it('debe validar la capacidad máxima si es enviada', async () => {
        const updateData: UpdateSportRequest = { max_capacity: 30 };
        vi.mocked(mockSportRepo.update).mockResolvedValueOnce({ ...mockExistingSport, ...updateData });

        await useCase.execute('sport-1', updateData);

        expect(mockSportValidator.validateMaxCapacity).toHaveBeenCalledWith(30);
        expect(mockSportRepo.update).toHaveBeenCalledWith('sport-1', { max_capacity: 30 });
    });

    it('debe actualizar descripción y capacidad máxima si los datos son válidos', async () => {
        const updateData: UpdateSportRequest = {
            description: 'Entrenamiento avanzado',
            max_capacity: 25,
        };
        vi.mocked(mockSportRepo.update).mockResolvedValueOnce({ ...mockExistingSport, ...updateData });

        const result = await useCase.execute('sport-1', updateData);

        expect(mockSportRepo.update).toHaveBeenCalledWith('sport-1', updateData);
        expect(result.description).toBe('Entrenamiento avanzado');
        expect(result.max_capacity).toBe(25);
    });

    it('debe permitir actualizar solamente la descripción sin validar capacidad', async () => {
        const updateData: UpdateSportRequest = { description: 'Nivel inicial' };
        vi.mocked(mockSportRepo.update).mockResolvedValueOnce({ ...mockExistingSport, ...updateData });

        await useCase.execute('sport-1', updateData);

        expect(mockSportValidator.validateMaxCapacity).not.toHaveBeenCalled();
        expect(mockSportRepo.update).toHaveBeenCalledWith('sport-1', updateData);
    });
});
