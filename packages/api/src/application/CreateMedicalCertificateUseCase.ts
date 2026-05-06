import { MedicalCertificateRepository } from '../domain/MedicalCertificateRepository.js';
import { MedicalCertificateValidator } from '../domain/services/MedicalCertificateValidator.js';
import { MedicalCertificateDTO,	CreateMedicalCertificateRequest } from '@alentapp/shared';

export class CreateMedicalCertificateUseCase {
	constructor(
		private readonly medicalCertificateRepository: MedicalCertificateRepository,
		private readonly medicalCertificateValidator: MedicalCertificateValidator
	) {}

	async execute(data: CreateMedicalCertificateRequest): Promise<MedicalCertificateDTO> {

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
			await this.medicalCertificateRepository.findActiveByMemberId(
				data.member_id
			);

		if (activeCertificate) { //si SI existe: invalidarlo
			await this.medicalCertificateRepository.invalidateById(
				activeCertificate.id
			);
		}

		const newCertificate = await this.medicalCertificateRepository.create(data);
        
		return newCertificate;
	}
}