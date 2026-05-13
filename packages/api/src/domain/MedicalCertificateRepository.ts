import { MedicalCertificateDTO, CreateMedicalCertificateRequest, UpdateMedicalCertificateRequest } from '@alentapp/shared';

export interface MedicalCertificateRepository {
    create(data: CreateMedicalCertificateRequest): Promise<MedicalCertificateDTO>;
    findActiveByMemberId(memberId: string): Promise<MedicalCertificateDTO | null>;
	invalidateById(id: string): Promise<void>;
    findById(id: string): Promise<MedicalCertificateDTO | null>;
    update(id: string, data: UpdateMedicalCertificateRequest): Promise<MedicalCertificateDTO>;
    delete(id: string): Promise<void>;
}