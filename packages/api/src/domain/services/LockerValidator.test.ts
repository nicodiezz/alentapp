import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LockerValidator } from './LockerValidator.js';
import { LockerRepository } from '../LockerRepository.js';
import { CreateLockerRequest, LockerDTO } from '@alentapp/shared';

describe('LockerValidator', () => {
    const mockLockerRepo: LockerRepository = {
        create: vi.fn(),
        findAll: vi.fn(),
        findById: vi.fn(),
        findByNumber: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    };

    const validator = new LockerValidator(mockLockerRepo);

    const validLocker: CreateLockerRequest = {
        number: 10,
        location: 'Vestuario A',
    };

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

    describe('validate', () => {
        it('debe pasar correctamente si todos los datos son válidos', async () => {
            vi.mocked(mockLockerRepo.findByNumber).mockResolvedValueOnce(null);

            await expect(validator.validate(validLocker)).resolves.not.toThrow();
            expect(mockLockerRepo.findByNumber).toHaveBeenCalledWith(10);
        });

        it('debe lanzar error si el número de casillero es undefined', async () => {
            const invalid = { ...validLocker, number: undefined } as unknown as CreateLockerRequest;

            await expect(validator.validate(invalid)).rejects.toThrow('El número de casillero es requerido');
            expect(mockLockerRepo.findByNumber).not.toHaveBeenCalled();
        });

        it('debe lanzar error si el número de casillero es null', async () => {
            const invalid = { ...validLocker, number: null } as unknown as CreateLockerRequest;

            await expect(validator.validate(invalid)).rejects.toThrow('El número de casillero es requerido');
            expect(mockLockerRepo.findByNumber).not.toHaveBeenCalled();
        });

        it('debe lanzar error si la ubicación está vacía', async () => {
            await expect(validator.validate({ ...validLocker, location: '' })).rejects.toThrow(
                'La ubicación es requerida',
            );
            expect(mockLockerRepo.findByNumber).not.toHaveBeenCalled();
        });

        it('debe lanzar error si la ubicación contiene solo espacios', async () => {
            await expect(validator.validate({ ...validLocker, location: '   ' })).rejects.toThrow(
                'La ubicación es requerida',
            );
            expect(mockLockerRepo.findByNumber).not.toHaveBeenCalled();
        });

        it('debe lanzar error si el número no es un entero', async () => {
            await expect(validator.validate({ ...validLocker, number: 3.5 })).rejects.toThrow(
                'El número de casillero debe ser numérico',
            );
            expect(mockLockerRepo.findByNumber).not.toHaveBeenCalled();
        });

        it('debe lanzar error si ya existe un casillero con ese número', async () => {
            vi.mocked(mockLockerRepo.findByNumber).mockResolvedValueOnce(existingLocker);

            await expect(validator.validate(validLocker)).rejects.toThrow('Ya existe un casillero con ese número');
        });
    });

    describe('validateUpdate', () => {
        it('debe pasar correctamente si no se modifican campos validados', async () => {
            await expect(validator.validateUpdate('locker-1', {})).resolves.not.toThrow();
            expect(mockLockerRepo.findByNumber).not.toHaveBeenCalled();
        });

        it('debe pasar correctamente si el número a actualizar es único', async () => {
            vi.mocked(mockLockerRepo.findByNumber).mockResolvedValueOnce(null);

            await expect(validator.validateUpdate('locker-1', { number: 99 })).resolves.not.toThrow();
            expect(mockLockerRepo.findByNumber).toHaveBeenCalledWith(99);
        });

        it('debe lanzar error si la ubicación actualizada está vacía', async () => {
            await expect(validator.validateUpdate('locker-1', { location: '' })).rejects.toThrow(
                'La ubicación es requerida',
            );
        });

        it('debe lanzar error si el número actualizado ya existe en otro casillero', async () => {
            vi.mocked(mockLockerRepo.findByNumber).mockResolvedValueOnce(existingLocker);

            await expect(validator.validateUpdate('locker-99', { number: 10 })).rejects.toThrow(
                'Ya existe un casillero con ese número',
            );
        });

        it('no debe lanzar error si el número actualizado pertenece al mismo casillero', async () => {
            vi.mocked(mockLockerRepo.findByNumber).mockResolvedValueOnce(existingLocker);

            await expect(validator.validateUpdate('locker-1', { number: 10 })).resolves.not.toThrow();
        });
    });
});
