import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EquipmentLoanValidator } from './EquipmentLoanValidator.js';
import { MemberRepository } from '../MemberRepository.js';

describe('EquipmentLoanValidator', () => {
    const mockMemberRepo = {
        findById: vi.fn(),
    } as unknown as MemberRepository;

    const validator = new EquipmentLoanValidator(mockMemberRepo);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('validateMemberCanBorrow', () => {
        it('debe pasar si el socio existe y su categoría es Pleno', async () => {
            vi.mocked(mockMemberRepo.findById).mockResolvedValueOnce({
                id: 'uuid-member-1',
                category: 'Pleno',
            } as any);

            await expect(validator.validateMemberCanBorrow('uuid-member-1')).resolves.not.toThrow();
            expect(mockMemberRepo.findById).toHaveBeenCalledWith('uuid-member-1');
        });

        it('debe pasar si el socio existe y su categoría es Honorario', async () => {
            vi.mocked(mockMemberRepo.findById).mockResolvedValueOnce({
                id: 'uuid-member-2',
                category: 'Honorario',
            } as any);

            await expect(validator.validateMemberCanBorrow('uuid-member-2')).resolves.not.toThrow();
        });

        it('debe lanzar error si el socio no existe', async () => {
            vi.mocked(mockMemberRepo.findById).mockResolvedValueOnce(null);

            await expect(validator.validateMemberCanBorrow('uuid-no')).rejects.toThrow('El socio no existe');
        });

        it('debe lanzar error si el socio es Cadete', async () => {
            vi.mocked(mockMemberRepo.findById).mockResolvedValueOnce({
                id: 'uuid-cadete',
                category: 'Cadete',
            } as any);

            await expect(validator.validateMemberCanBorrow('uuid-cadete')).rejects.toThrow(
                'La categoría del socio no le permite tomar prestamos',
            );
        });
    });

    describe('validateStatus', () => {
        it('debe pasar si el estado es Loaned, Returned o Damaged', () => {
            expect(() => validator.validateStatus('Loaned')).not.toThrow();
            expect(() => validator.validateStatus('Returned')).not.toThrow();
            expect(() => validator.validateStatus('Damaged')).not.toThrow();
        });

        it('debe lanzar error si el estado no es uno de los permitidos', () => {
            expect(() => validator.validateStatus('Perdido')).toThrow('El estado del préstamo no es válido');
            expect(() => validator.validateStatus('')).toThrow('El estado del préstamo no es válido');
        });
    });

    describe('validateDateFormat', () => {
        it('debe pasar correctamente si el formato de fecha es válido', () => {
            expect(() => validator.validateDateFormat('2026-01-01')).not.toThrow();
            expect(() => validator.validateDateFormat('2026-12-31')).not.toThrow();
        });

        it('debe pasar si la fecha es un objeto Date válido', () => {
            expect(() => validator.validateDateFormat(new Date('2026-01-01'))).not.toThrow();
        });

        it('debe lanzar error si el formato de fecha es inválido', () => {
            expect(() => validator.validateDateFormat('fecha-invalida')).toThrow('Formato de fecha inválido');
            expect(() => validator.validateDateFormat('01-01-2026')).toThrow('Formato de fecha inválido');
            expect(() => validator.validateDateFormat('2026-13-01')).toThrow('Formato de fecha inválido');
            expect(() => validator.validateDateFormat('2026-02-30')).toThrow('Formato de fecha inválido');
        });

        it('debe lanzar error si la fecha es un objeto Date inválido', () => {
            expect(() => validator.validateDateFormat(new Date('invalid'))).toThrow('Formato de fecha inválido');
        });
    });

    describe('validateLoanDates', () => {
        it('debe pasar correctamente si due_date es posterior a loan_date', () => {
            expect(() => validator.validateLoanDates('2026-05-01', '2026-05-15')).not.toThrow();
        });

        it('debe lanzar error si due_date es anterior a loan_date', () => {
            expect(() => validator.validateLoanDates('2026-05-15', '2026-05-01')).toThrow(
                'La fecha de devolución esperada debe ser mayor a la fecha del préstamo',
            );
        });

        it('debe lanzar error si due_date es igual a loan_date', () => {
            expect(() => validator.validateLoanDates('2026-05-01', '2026-05-01')).toThrow(
                'La fecha de devolución esperada debe ser mayor a la fecha del préstamo',
            );
        });

        it('debe lanzar error si alguna fecha es inválida', () => {
            expect(() => validator.validateLoanDates('fecha-invalida', '2026-05-15')).toThrow(
                'Formato de fecha inválido',
            );
        });
    });
});
