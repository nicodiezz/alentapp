import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateMedicalCertificateUseCase } from './UpdateMedicalCertificateUseCase.js';
import { MedicalCertificateRepository } from '../domain/MedicalCertificateRepository.js';
import { MedicalCertificateValidator } from '../domain/services/MedicalCertificateValidator.js';
import { UpdateMedicalCertificateRequest, MedicalCertificateDTO } from '@alentapp/shared';

describe('UpdateMedicalCertificateUseCase', () => {
    const mockMedicalCertificateRepo = {
        findById: vi.fn(),
        update: vi.fn(),
        findActiveByMemberId: vi.fn(),
        invalidateById: vi.fn(),
    } as unknown as MedicalCertificateRepository;

    const mockMedicalCertificateValidator = {
        validateDateFormat: vi.fn(),
        validateDates: vi.fn(),
    } as unknown as MedicalCertificateValidator;

    const useCase = new UpdateMedicalCertificateUseCase(mockMedicalCertificateRepo, mockMedicalCertificateValidator);

    const mockExistingCertificate: MedicalCertificateDTO = {
        id: 'uuid-cert-1',
        issue_date: '2026-01-01',
        expiry_date: '2027-01-01',
        doctor_license: 'MED-123',
        member_id: 'uuid-member-1',
        is_validated: false,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(mockMedicalCertificateRepo.findById).mockResolvedValue(mockExistingCertificate);
    });

    it('debe lanzar error si el certificado no existe', async () => {
        vi.mocked(mockMedicalCertificateRepo.findById).mockResolvedValueOnce(null);
        await expect(useCase.execute('uuid-no', {})).rejects.toThrow('El certificado no existe');
    });

    it('debe validar formato y orden de fechas si se envían', async () => {
        const updateData: UpdateMedicalCertificateRequest = { expiry_date: '2028-01-01' };
        vi.mocked(mockMedicalCertificateRepo.update).mockResolvedValueOnce({ ...mockExistingCertificate, ...updateData });

        await useCase.execute('uuid-cert-1', updateData);

        expect(mockMedicalCertificateValidator.validateDateFormat).toHaveBeenCalledWith('2028-01-01');
        expect(mockMedicalCertificateValidator.validateDates).toHaveBeenCalledWith(
            mockExistingCertificate.issue_date,
            '2028-01-01'
        );
        expect(mockMedicalCertificateRepo.update).toHaveBeenCalledWith('uuid-cert-1', expect.objectContaining({
            expiry_date: '2028-01-01',
        }));
    });

    it('debe actualizar exitosamente y retornar los nuevos datos', async () => {
        const updateData: UpdateMedicalCertificateRequest = { doctor_license: 'MED-999' };
        vi.mocked(mockMedicalCertificateRepo.update).mockResolvedValueOnce({ ...mockExistingCertificate, ...updateData });

        const result = await useCase.execute('uuid-cert-1', updateData);

        expect(mockMedicalCertificateRepo.update).toHaveBeenCalledWith('uuid-cert-1', expect.objectContaining({
            doctor_license: 'MED-999',
        }));
        expect(result.doctor_license).toBe('MED-999');
    });

    it('debe invalidar el certificado activo previo al validar un certificado', async () => {
        const updateData: UpdateMedicalCertificateRequest = { is_validated: true };
        const activeCertificate: MedicalCertificateDTO = {
            id: 'uuid-cert-old',
            issue_date: '2025-01-01',
            expiry_date: '2026-01-01',
            doctor_license: 'MED-OLD',
            member_id: 'uuid-member-1',
            is_validated: true,
        };
        vi.mocked(mockMedicalCertificateRepo.findActiveByMemberId).mockResolvedValueOnce(activeCertificate);
        vi.mocked(mockMedicalCertificateRepo.update).mockResolvedValueOnce({ ...mockExistingCertificate, is_validated: true });

        const result = await useCase.execute('uuid-cert-1', updateData);

        expect(mockMedicalCertificateRepo.findActiveByMemberId).toHaveBeenCalledWith('uuid-member-1');
        expect(mockMedicalCertificateRepo.invalidateById).toHaveBeenCalledWith('uuid-cert-old');
        expect(mockMedicalCertificateRepo.update).toHaveBeenCalledWith('uuid-cert-1', expect.objectContaining({
            is_validated: true,
        }));
        expect(result.is_validated).toBe(true);
    });
});