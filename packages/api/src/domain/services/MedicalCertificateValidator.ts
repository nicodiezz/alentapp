import { MemberRepository } from '../MemberRepository.js';
import { MedicalCertificateRepository } from '../MedicalCertificateRepository.js';

export class MedicalCertificateValidator {
    constructor(private readonly memberRepo: MemberRepository) {} //se agrega como parametro al constructor ya q necesita usar funciones de OTRAS entidades (member) en validateMemberExists

    validateDates(issueDate: string, expiryDate: string): void {
        const issue = new Date(issueDate);
        const expiry = new Date(expiryDate);

        if (expiry < issue) {
            throw new Error('La fecha de vencimiento no puede ser previa a la fecha de emision');
        }
    }

    async validateMemberExists(memberId: string): Promise<void> {
        const member = await this.memberRepo.findById(memberId);

        if (!member) {
            throw new Error('El socio indicado no existe');
        }
    }

    async validateCertificateExists(id: string, medicalCertificateRepo: MedicalCertificateRepository): Promise<void> {
        const certificate = await medicalCertificateRepo.findById(id);

        if (!certificate) {
            throw new Error('El certificado no existe');
        }
    }

    validateDateFormat(date: string): void {
        const parsed = new Date(date);

        if (isNaN(parsed.getTime())) {
            throw new Error('Formato de fecha inválido');
        }
    }
}