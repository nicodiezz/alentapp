import { MedicalCertificateRepository } from '../domain/MedicalCertificateRepository.js';

export class DeleteMedicalCertificateUseCase {
    constructor(
        private readonly medicalCertificateRepo: MedicalCertificateRepository
    ) {}

    async execute(id: string): Promise<void> {
        const existingCertificate = await this.medicalCertificateRepo.findById(id);
	    if (!existingCertificate) {
		    throw new Error('El certificado no existe');
	    }
        await this.medicalCertificateRepo.delete(id);
    }
}