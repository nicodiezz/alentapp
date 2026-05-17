import { MemberRepository } from '../MemberRepository.js';

export class EquipmentLoanValidator {
    constructor(private readonly memberRepo: MemberRepository) {}

    async validateMemberCanBorrow(member_id: string): Promise<void> {
        const member = await this.memberRepo.findById(member_id);
        if (!member) {
            throw new Error('El socio no existe');
        }

        const isAllowedCategory = member.category === 'Pleno' || member.category === 'Honorario';
        if (!isAllowedCategory) {
            throw new Error('La categoría del socio no le permite tomar prestamos');
        }
    }

    validateDateFormat(date: string | Date): void {
        if (date instanceof Date) {
            if (Number.isNaN(date.getTime())) {
                throw new Error('Formato de fecha inválido');
            }
            return;
        }

        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
        if (!match) {
            throw new Error('Formato de fecha inválido');
        }

        const [, yearString, monthString, dayString] = match;
        const year = Number(yearString);
        const month = Number(monthString);
        const day = Number(dayString);
        const parsedDate = new Date(Date.UTC(year, month - 1, day));

        const isValidDate =
            parsedDate.getUTCFullYear() === year &&
            parsedDate.getUTCMonth() === month - 1 &&
            parsedDate.getUTCDate() === day;

        if (!isValidDate) {
            throw new Error('Formato de fecha inválido');
        }
    }

    validateLoanDates(loan_date: string | Date, due_date: string | Date): void {
        const loanDate = loan_date instanceof Date ? loan_date : new Date(loan_date);
        const dueDate = due_date instanceof Date ? due_date : new Date(due_date);

        if (Number.isNaN(loanDate.getTime()) || Number.isNaN(dueDate.getTime())) {
            throw new Error('Formato de fecha inválido');
        }

        if (dueDate <= loanDate) {
            throw new Error('La fecha de devolución esperada debe ser mayor a la fecha del préstamo');
        }
    }
}
