import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MedicalCertificateValidator } from './MedicalCertificateValidator.js';
import { MemberRepository } from '../MemberRepository.js';

describe('MedicalCertificateValidator', () => {
    const mockMemberRepo = {
        findById: vi.fn(),
    } as unknown as MemberRepository;

    const validator = new MedicalCertificateValidator(mockMemberRepo);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('validateDates', () => {
        it('debe pasar correctamente si expiry_date es posterior a issue_date', () => {
            expect(() => validator.validateDates('2026-01-01', '2027-01-01')).not.toThrow();
        });

        it('debe lanzar error si expiry_date es anterior a issue_date', () => {
            expect(() => validator.validateDates('2027-01-01', '2026-01-01')).toThrow('La fecha de vencimiento no puede ser previa a la fecha de emision');
        });
    });

    describe('validateMemberExists', () => {
        it('debe pasar si el miembro existe en la base de datos', async () => {
            vi.mocked(mockMemberRepo.findById).mockResolvedValueOnce({ id: 'uuid-member-1' } as any);

            await expect(validator.validateMemberExists('uuid-member-1')).resolves.not.toThrow();
            expect(mockMemberRepo.findById).toHaveBeenCalledWith('uuid-member-1');
        });

        it('debe lanzar error si el miembro no existe', async () => {
            vi.mocked(mockMemberRepo.findById).mockResolvedValueOnce(null);

            await expect(validator.validateMemberExists('uuid-no')).rejects.toThrow('El socio indicado no existe');
        });
    });

    describe('validateDateFormat', () => {
        it('debe pasar correctamente si el formato de fecha es válido', () => {
            expect(() => validator.validateDateFormat('2026-01-01')).not.toThrow();
            expect(() => validator.validateDateFormat('2027-12-31')).not.toThrow();
        });

        it('debe lanzar error si el formato de fecha es inválido', () => {
            expect(() => validator.validateDateFormat('fecha-invalida')).toThrow('Formato de fecha inválido');
            expect(() => validator.validateDateFormat('32-13-2026')).toThrow('Formato de fecha inválido');
        });
    });
});