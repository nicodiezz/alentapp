import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateLockerUseCase } from './NewLockerUseCase.js';
import { LockerRepository } from '../domain/LockerRepository.js';
import { LockerValidator } from '../domain/services/LockerValidator.js';
import { CreateLockerRequest } from '@alentapp/shared';

describe('CreateLockerUseCase', () => {
    const mockLockerRepo: LockerRepository = {
        create: vi.fn(),
        findAll: vi.fn(),
        findById: vi.fn(),
        findByNumber: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    };

    const mockLockerValidator = new LockerValidator(mockLockerRepo);
    const validateSpy = vi.spyOn(mockLockerValidator, 'validate');

    const useCase = new CreateLockerUseCase(mockLockerRepo, mockLockerValidator);

    beforeEach(() => {
        vi.clearAllMocks();
        validateSpy.mockResolvedValue(undefined);
    });

    it('debe crear un casillero exitosamente si pasa las validaciones', async () => {
        const mockRequest: CreateLockerRequest = {
            number: 10,
            location: 'Vestuario A',
        };

        vi.mocked(mockLockerRepo.create).mockResolvedValueOnce({
            id: 'locker-1',
            number: 10,
            location: 'Vestuario A',
            status: 'Available',
            member_id: null,
        });

        const result = await useCase.execute(mockRequest);

        expect(mockLockerValidator.validate).toHaveBeenCalledWith(mockRequest);
        expect(mockLockerRepo.create).toHaveBeenCalledWith({ number: 10, location: 'Vestuario A' });
        expect(result.id).toBe('locker-1');
        expect(result.number).toBe(10);
        expect(result.status).toBe('Available');
    });

    it('debe recortar espacios de la ubicación antes de persistir', async () => {
        const mockRequest: CreateLockerRequest = {
            number: 20,
            location: '  Vestuario B  ',
        };

        vi.mocked(mockLockerRepo.create).mockResolvedValueOnce({
            id: 'locker-2',
            number: 20,
            location: 'Vestuario B',
            status: 'Available',
            member_id: null,
        });

        await useCase.execute(mockRequest);

        expect(mockLockerRepo.create).toHaveBeenCalledWith(expect.objectContaining({
            location: 'Vestuario B',
        }));
    });

    it('debe propagar el error del validador y no crear el casillero', async () => {
        const mockRequest: CreateLockerRequest = {
            number: 10,
            location: 'Vestuario A',
        };

        validateSpy.mockRejectedValueOnce(new Error('Ya existe un casillero con ese número'));

        await expect(useCase.execute(mockRequest)).rejects.toThrow('Ya existe un casillero con ese número');
        expect(mockLockerRepo.create).not.toHaveBeenCalled();
    });
});
