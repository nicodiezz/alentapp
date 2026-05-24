import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateMedicalCertificateUseCase } from './CreateMedicalCertificateUseCase.js';
import { MedicalCertificateRepository } from '../domain/MedicalCertificateRepository.js';
import { MedicalCertificateValidator } from '../domain/services/MedicalCertificateValidator.js';
import { CreateMedicalCertificateRequest } from '@alentapp/shared';

describe('CreateMedicalCertificateUseCase', () => {
    // 1. Creamos Mocks de nuestras dependencias (Puertos y Servicios)
    const mockMedicalCertificateRepo = {
        create: vi.fn(),
        findActiveByMemberId: vi.fn(),
        invalidateById: vi.fn(),
    } as unknown as MedicalCertificateRepository;

    const mockMedicalCertificateValidator = {
        validateDates: vi.fn(),
        validateMemberExists: vi.fn(),
    } as unknown as MedicalCertificateValidator;

    // 2. Instanciamos el caso de uso inyectando los mocks
    const useCase = new CreateMedicalCertificateUseCase(mockMedicalCertificateRepo, mockMedicalCertificateValidator);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe crear un certificado exitosamente cuando el socio existe y las fechas son válidas', async () => {
        const mockRequest: CreateMedicalCertificateRequest = {
            issue_date: '2026-01-01',
            expiry_date: '2027-01-01',
            doctor_license: 'MED-123',
            member_id: 'uuid-member-1',
        };

        vi.mocked(mockMedicalCertificateRepo.findActiveByMemberId).mockResolvedValueOnce(null);
        vi.mocked(mockMedicalCertificateRepo.create).mockResolvedValueOnce({
            id: 'uuid-cert-1',
            ...mockRequest,
            is_validated: false,
        });

        const result = await useCase.execute(mockRequest);

        //validaciones de negocio (validator)
        expect(mockMedicalCertificateValidator.validateDates).toHaveBeenCalledWith(
            mockRequest.issue_date,
            mockRequest.expiry_date
        );
        expect(mockMedicalCertificateValidator.validateMemberExists).toHaveBeenCalledWith(
            mockRequest.member_id
        );

        //verifica que se haya intentado persistir con los valores correctos
        expect(mockMedicalCertificateRepo.create).toHaveBeenCalledWith(expect.objectContaining({
            issue_date: '2026-01-01',
            expiry_date: '2027-01-01',
            doctor_license: 'MED-123',
            member_id: 'uuid-member-1',
        }));
        expect(result.id).toBe('uuid-cert-1');
    });

    it('debe lanzar error si faltan campos requeridos', async () => {
        const mockRequest: CreateMedicalCertificateRequest = {
            issue_date: '2026-01-01',
            expiry_date: '2027-01-01',
            doctor_license: '', //campo faltante
            member_id: '', //campo faltante
        };

        await expect(useCase.execute(mockRequest)).rejects.toThrow('Todos los campos son requeridos');
    });


    it('debe invalidar el certificado activo anterior y crear el nuevo si el socio ya tenía uno', async () => {
        const mockRequest: CreateMedicalCertificateRequest = {
            issue_date: '2026-06-01',
            expiry_date: '2027-06-01',
            doctor_license: 'MED-456',
            member_id: 'uuid-member-1',
        };

        const existingCertificate = { 
            id: 'uuid-cert-old', 
            member_id: 'uuid-member-1', 
            is_validated: true,
            issue_date: '2025-01-01',
            expiry_date: '2026-01-01',
            doctor_license: 'MED-OLD',
        };
        vi.mocked(mockMedicalCertificateRepo.findActiveByMemberId).mockResolvedValueOnce(existingCertificate);
        vi.mocked(mockMedicalCertificateRepo.create).mockResolvedValueOnce({
            id: 'uuid-cert-new',
            ...mockRequest,
            is_validated: false,
        });

        const result = await useCase.execute(mockRequest);

        expect(mockMedicalCertificateValidator.validateDates).toHaveBeenCalledWith(
            mockRequest.issue_date,
            mockRequest.expiry_date
        );
        expect(mockMedicalCertificateValidator.validateMemberExists).toHaveBeenCalledWith(
            mockRequest.member_id
        );
        expect(mockMedicalCertificateRepo.invalidateById).toHaveBeenCalledWith('uuid-cert-old');
        expect(mockMedicalCertificateRepo.create).toHaveBeenCalledWith(expect.objectContaining({
            issue_date: '2026-06-01',
            expiry_date: '2027-06-01',
            doctor_license: 'MED-456',
            member_id: 'uuid-member-1',
        }));
        expect(result.id).toBe('uuid-cert-new');
    });
});