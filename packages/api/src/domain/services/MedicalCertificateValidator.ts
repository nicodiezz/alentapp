import { MemberRepository } from '../MemberRepository.js';

export class MedicalCertificateValidator {
    constructor(private readonly memberRepo: MemberRepository) {}

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
}