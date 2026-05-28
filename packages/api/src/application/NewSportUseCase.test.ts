import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateSportUseCase } from './NewSportUseCase.js';
import { SportRepository } from '../domain/SportRepository.js';
import { SportValidator } from '../domain/services/SportValidator.js';
import { CreateSportRequest } from '@alentapp/shared';

describe('CreateSportUseCase', () => {
    const mockSportRepo = {
        create: vi.fn(),
    } as unknown as SportRepository;

    const mockSportValidator = {
        validate: vi.fn(),
    } as unknown as SportValidator;

    const useCase = new CreateSportUseCase(mockSportRepo, mockSportValidator);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe crear un deporte exitosamente si pasa las validaciones', async () => {
        const mockRequest: CreateSportRequest = {
            name: 'Natación',
            description: 'Clases en pileta cubierta',
            max_capacity: 20,
            additional_price: 1500,
            requires_medical_certificate: true,
        };

        vi.mocked(mockSportRepo.create).mockResolvedValueOnce({
            id: 'sport-1',
            ...mockRequest,
        });

        const result = await useCase.execute(mockRequest);

        expect(mockSportValidator.validate).toHaveBeenCalledWith(mockRequest);
        expect(mockSportRepo.create).toHaveBeenCalledWith(mockRequest);
        expect(result.id).toBe('sport-1');
        expect(result.name).toBe('Natación');
    });

    it('debe recortar espacios del nombre y descripción antes de persistir', async () => {
        const mockRequest: CreateSportRequest = {
            name: '  Tenis  ',
            description: '  Canchas de polvo de ladrillo  ',
            max_capacity: 12,
            additional_price: 2000,
            requires_medical_certificate: false,
        };

        vi.mocked(mockSportRepo.create).mockResolvedValueOnce({
            id: 'sport-2',
            ...mockRequest,
            name: 'Tenis',
            description: 'Canchas de polvo de ladrillo',
        });

        await useCase.execute(mockRequest);

        expect(mockSportRepo.create).toHaveBeenCalledWith(expect.objectContaining({
            name: 'Tenis',
            description: 'Canchas de polvo de ladrillo',
        }));
    });

    it('debe propagar el error del validador y no crear el deporte', async () => {
        const mockRequest: CreateSportRequest = {
            name: 'Natación',
            description: 'Clases en pileta cubierta',
            max_capacity: 0,
            additional_price: 1500,
            requires_medical_certificate: true,
        };
        vi.mocked(mockSportValidator.validate).mockRejectedValueOnce(
            new Error('La capacidad máxima debe ser mayor a cero'),
        );

        await expect(useCase.execute(mockRequest)).rejects.toThrow('La capacidad máxima debe ser mayor a cero');
        expect(mockSportRepo.create).not.toHaveBeenCalled();
    });
});
