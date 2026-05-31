import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeleteLockerUseCase } from './DeleteLockerUseCase.js';
import { LockerRepository } from '../domain/LockerRepository.js';
import { LockerDTO } from '@alentapp/shared';

describe('DeleteLockerUseCase', () => {
    const mockLockerRepo: LockerRepository = {
        create: vi.fn(),
        findAll: vi.fn(),
        findById: vi.fn(),
        findByNumber: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    };

    const useCase = new DeleteLockerUseCase(mockLockerRepo);

    const existingLocker: LockerDTO = {
        id: 'locker-1',
        number: 10,
        location: 'Vestuario A',
        status: 'Available',
        member_id: null,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe eliminar el casillero correctamente cuando existe', async () => {
        vi.mocked(mockLockerRepo.findById).mockResolvedValueOnce(existingLocker);
        vi.mocked(mockLockerRepo.delete).mockResolvedValueOnce(undefined);

        await expect(useCase.execute('locker-1')).resolves.not.toThrow();

        expect(mockLockerRepo.findById).toHaveBeenCalledWith('locker-1');
        expect(mockLockerRepo.delete).toHaveBeenCalledWith('locker-1');
    });

    it('debe lanzar error si el casillero no existe', async () => {
        vi.mocked(mockLockerRepo.findById).mockResolvedValueOnce(null);

        await expect(useCase.execute('locker-999')).rejects.toThrow('El Locker no existe');
        expect(mockLockerRepo.delete).not.toHaveBeenCalled();
    });

    it('no debe llamar a delete si el casillero no existe', async () => {
        vi.mocked(mockLockerRepo.findById).mockResolvedValueOnce(null);

        try {
            await useCase.execute('locker-999');
        } catch {
            // expected error
        }

        expect(mockLockerRepo.delete).not.toHaveBeenCalled();
    });
});
