import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetMedicalCertificatesUseCase } from './GetMedicalCertificateUseCase.js';
import { MedicalCertificateRepository } from '../domain/MedicalCertificateRepository.js';

describe('GetMedicalCertificatesUseCase', () => {
    const mockMedicalCertificateRepo = {
        findAll: vi.fn(),
    } as unknown as MedicalCertificateRepository;

    const useCase = new GetMedicalCertificatesUseCase(mockMedicalCertificateRepo);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe retornar la lista de certificados médicos', async () => {
        const mockCertificates = [{ id: '1', doctor_license: 'ABC' }, { id: '2', doctor_license: 'XYZ' }];
        vi.mocked(mockMedicalCertificateRepo.findAll).mockResolvedValueOnce(mockCertificates as any);

        const result = await useCase.execute();
        expect(result).toEqual(mockCertificates);
        expect(mockMedicalCertificateRepo.findAll).toHaveBeenCalledOnce();
    });
});