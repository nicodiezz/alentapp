import { MedicalCertificateDTO, CreateMedicalCertificateRequest } from '@alentapp/shared';

export interface MedicalCertificateRepository {
    create(data: CreateMedicalCertificateRequest): Promise<MedicalCertificateDTO>;
    findActiveByMemberId(memberId: string): Promise<MedicalCertificateDTO | null>;
	invalidateById(id: string): Promise<void>;
}