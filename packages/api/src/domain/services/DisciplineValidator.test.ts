import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DisciplineValidator } from './DisciplineValidator.js';

describe('DisciplineValidator', () => {
    const validator = new DisciplineValidator();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('validateDates', () => {
        it('debe pasar correctamente si la fecha de inicio es anterior a la fecha de fin', () => {
            expect(() => validator.validateDates('2026-05-01', '2026-05-10')).not.toThrow();
        });

        it('debe lanzar un error si la fecha de inicio es posterior a la fecha de fin', () => {
            expect(() => validator.validateDates('2026-05-10', '2026-05-01')).toThrow(
                'La fecha de fin de suspensión no puede ser previa o igual a la fecha de inicio',
            );
        });
    });

    describe('validateDateFormat', () => {
        it('debe pasar correctamente si la fecha tiene formato YYYY-MM-DD y es real', () => {
            expect(() => validator.validateDateFormat('2026-05-01')).not.toThrow();
            expect(() => validator.validateDateFormat('2024-02-29')).not.toThrow();
        });

        it('debe pasar correctamente si recibe un objeto Date valido', () => {
            expect(() => validator.validateDateFormat(new Date('2026-05-01'))).not.toThrow();
        });

        it('debe lanzar un error si la fecha no respeta el formato YYYY-MM-DD', () => {
            expect(() => validator.validateDateFormat('2026-5-01')).toThrow('Formato de fecha inválido');
            expect(() => validator.validateDateFormat('01-05-2026')).toThrow('Formato de fecha inválido');
            expect(() => validator.validateDateFormat('fecha')).toThrow('Formato de fecha inválido');
        });

        it('debe lanzar un error si la fecha no existe en el calendario', () => {
            expect(() => validator.validateDateFormat('2026-02-29')).toThrow('Formato de fecha inválido');
            expect(() => validator.validateDateFormat('2026-04-31')).toThrow('Formato de fecha inválido');
            expect(() => validator.validateDateFormat('2026-13-01')).toThrow('Formato de fecha inválido');
        });

        it('debe lanzar un error si recibe un objeto Date inválido', () => {
            expect(() => validator.validateDateFormat(new Date('fecha'))).toThrow('Formato de fecha inválido');
        });
    });
});
