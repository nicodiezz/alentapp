import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SportValidator } from './SportValidator.js';
import { SportRepository } from '../SportRepository.js';
import { CreateSportRequest } from '@alentapp/shared';

describe('SportValidator', () => {
    const mockSportRepo = {
        findByName: vi.fn(),
    } as unknown as SportRepository;

    const validator = new SportValidator(mockSportRepo);

    const validSport: CreateSportRequest = {
        name: 'Natación',
        description: 'Clases en pileta cubierta',
        max_capacity: 20,
        additional_price: 1500,
        requires_medical_certificate: true,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('validate', () => {
        it('debe pasar correctamente si todos los datos son válidos', async () => {
            vi.mocked(mockSportRepo.findByName).mockResolvedValueOnce(null);

            await expect(validator.validate(validSport)).resolves.not.toThrow();
            expect(mockSportRepo.findByName).toHaveBeenCalledWith('Natación');
        });

        it('debe lanzar error si el nombre está vacío', async () => {
            await expect(validator.validate({ ...validSport, name: '   ' })).rejects.toThrow('El nombre es requerido');
            expect(mockSportRepo.findByName).not.toHaveBeenCalled();
        });

        it('debe lanzar error si la descripción está vacía', async () => {
            await expect(validator.validate({ ...validSport, description: '' })).rejects.toThrow(
                'La descripción es requerida',
            );
            expect(mockSportRepo.findByName).not.toHaveBeenCalled();
        });

        it('debe lanzar error si el precio adicional no fue informado', async () => {
            await expect(validator.validate({ ...validSport, additional_price: undefined as any })).rejects.toThrow(
                'El precio adicional es requerido',
            );
            expect(mockSportRepo.findByName).not.toHaveBeenCalled();
        });

        it('debe lanzar error si el certificado médico no fue informado', async () => {
            await expect(
                validator.validate({ ...validSport, requires_medical_certificate: undefined as any }),
            ).rejects.toThrow('El certificado médico es requerido');
            expect(mockSportRepo.findByName).not.toHaveBeenCalled();
        });

        it('debe lanzar error si ya existe un deporte con el mismo nombre', async () => {
            vi.mocked(mockSportRepo.findByName).mockResolvedValueOnce({ id: 'sport-1', name: 'Natación' } as any);

            await expect(validator.validate(validSport)).rejects.toThrow('Ya existe un deporte con ese nombre');
        });

        it('debe buscar el nombre sin espacios al validar unicidad', async () => {
            vi.mocked(mockSportRepo.findByName).mockResolvedValueOnce(null);

            await validator.validate({ ...validSport, name: '  Natación  ' });

            expect(mockSportRepo.findByName).toHaveBeenCalledWith('Natación');
        });
    });

    describe('validateMaxCapacity', () => {
        it('debe pasar correctamente si la capacidad máxima es un entero mayor a cero', () => {
            expect(() => validator.validateMaxCapacity(1)).not.toThrow();
            expect(() => validator.validateMaxCapacity(20)).not.toThrow();
        });

        it('debe lanzar error si la capacidad máxima es cero', () => {
            expect(() => validator.validateMaxCapacity(0)).toThrow('La capacidad máxima debe ser mayor a cero');
        });

        it('debe lanzar error si la capacidad máxima es negativa', () => {
            expect(() => validator.validateMaxCapacity(-5)).toThrow('La capacidad máxima debe ser mayor a cero');
        });

        it('debe lanzar error si la capacidad máxima no es un número entero', () => {
            expect(() => validator.validateMaxCapacity(10.5)).toThrow('La capacidad máxima debe ser mayor a cero');
        });
    });
});
