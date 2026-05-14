import { MedicalCertificateRepository } from '../domain/MedicalCertificateRepository.js';
import { MedicalCertificateValidator } from '../domain/services/MedicalCertificateValidator.js';

export class DeleteMedicalCertificateUseCase {
    constructor(
        private readonly medicalCertificateRepo: MedicalCertificateRepository,
        private readonly medicalCertificateValidator: MedicalCertificateValidator
    ) {}

    async execute(id: string): Promise<void> {
        await this.medicalCertificateValidator.validateCertificateExists(id, this.medicalCertificateRepo);
        await this.medicalCertificateRepo.delete(id);
    }
}