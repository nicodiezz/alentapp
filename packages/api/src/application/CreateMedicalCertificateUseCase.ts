import { MedicalCertificateRepository } from '../domain/MedicalCertificateRepository.js';
import { MedicalCertificateValidator } from '../domain/services/MedicalCertificateValidator.js';
import { MedicalCertificateDTO,	CreateMedicalCertificateRequest } from '@alentapp/shared';

export class CreateMedicalCertificateUseCase {
	constructor(
		private readonly medicalCertificateRepo: MedicalCertificateRepository,
		private readonly medicalCertificateValidator: MedicalCertificateValidator
	) {}

	async execute(data: CreateMedicalCertificateRequest): Promise<MedicalCertificateDTO> {

		if (!data.issue_date || !data.expiry_date || !data.doctor_license || !data.member_id) {
        	throw new Error('Todos los campos son requeridos');
    	}
		
		//fecha de vencimiento debe ser > que la fecha de emision.
		this.medicalCertificateValidator.validateDates(
			data.issue_date,
			data.expiry_date
		);

        //existe el miembro?
		await this.medicalCertificateValidator.validateMemberExists(
			data.member_id
		);

		//existe certificado activo para este miembro?
		const activeCertificate =
			await this.medicalCertificateRepo.findActiveByMemberId(
				data.member_id
			);

		if (activeCertificate) { //si SI existe: invalidarlo
			await this.medicalCertificateRepo.invalidateById(
				activeCertificate.id
			);
		}

		const newCertificate = await this.medicalCertificateRepo.create(data);
        
		return newCertificate;
	}
}