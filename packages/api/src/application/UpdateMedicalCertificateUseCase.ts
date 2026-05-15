import { MedicalCertificateRepository } from '../domain/MedicalCertificateRepository.js';
import { MedicalCertificateValidator } from '../domain/services/MedicalCertificateValidator.js';
import { MedicalCertificateDTO, UpdateMedicalCertificateRequest } from '@alentapp/shared';

export class UpdateMedicalCertificateUseCase {
    constructor(
        private readonly medicalCertificateRepo: MedicalCertificateRepository,
        private readonly medicalCertificateValidator: MedicalCertificateValidator
    ) {}

    async execute(id: string, data: UpdateMedicalCertificateRequest): Promise<MedicalCertificateDTO> {

        //valida existencia del certificado
        const existingCertificate = await this.medicalCertificateRepo.findById(id);
        if (!existingCertificate) {
            throw new Error('El certificado no existe');
        }

        //valida formato de fechas validas
        if (data.issue_date) {
            this.medicalCertificateValidator.validateDateFormat(data.issue_date);
        }
        if (data.expiry_date) {
            this.medicalCertificateValidator.validateDateFormat(data.expiry_date);
        }

        //si se quiere modificar alguna fecha, obtiene el valor persistido de LA OTRA fecha y valida que expiry_date continue siendo posterior a issue_date.
        if (data.issue_date || data.expiry_date) {
            const issueDate = data.issue_date || existingCertificate!.issue_date; //obtiene valor de req si mandaron, sino: toma valor actual del certificado
            const expiryDate = data.expiry_date || existingCertificate!.expiry_date;
            this.medicalCertificateValidator.validateDates(issueDate, expiryDate); //delega validacion
        }

        return this.medicalCertificateRepo.update(id, data);
    }
}