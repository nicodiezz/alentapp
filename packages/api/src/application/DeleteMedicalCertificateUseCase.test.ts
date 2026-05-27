import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeleteMedicalCertificateUseCase } from './DeleteMedicalCertificateUseCase.js';
import { MedicalCertificateRepository } from '../domain/MedicalCertificateRepository.js';

describe('DeleteMedicalCertificateUseCase', () => {
    const mockMedicalCertificateRepo = {
        findById: vi.fn(),
        delete: vi.fn(),
    } as unknown as MedicalCertificateRepository;

    const useCase = new DeleteMedicalCertificateUseCase(mockMedicalCertificateRepo);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe lanzar error si el certificado no existe', async () => {
        vi.mocked(mockMedicalCertificateRepo.findById).mockResolvedValueOnce(null);
        await expect(useCase.execute('uuid-999')).rejects.toThrow('El certificado no existe');
        expect(mockMedicalCertificateRepo.delete).not.toHaveBeenCalled();
    });

    it('debe eliminar el certificado si existe', async () => {
        vi.mocked(mockMedicalCertificateRepo.findById).mockResolvedValueOnce({
            id: 'uuid-cert-1',
            issue_date: '2026-01-01',
            expiry_date: '2027-01-01',
            doctor_license: 'MED-123',
            member_id: 'uuid-member-1',
            is_validated: false,
        });
        await useCase.execute('uuid-cert-1');
        expect(mockMedicalCertificateRepo.delete).toHaveBeenCalledWith('uuid-cert-1');
    });
});