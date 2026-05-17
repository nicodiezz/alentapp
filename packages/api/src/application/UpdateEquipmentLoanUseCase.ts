import { EquipmentLoanRepository } from '../domain/EquipmentLoanRepository.js';
import { EquipmentLoanValidator } from '../domain/services/EquipmentLoanValidator.js';
import { UpdateEquipmentLoanRequest, EquipmentLoanDTO } from '@alentapp/shared';

export class UpdateEquipmentLoanUseCase {
    constructor(
        private readonly equipmentLoanRepository: EquipmentLoanRepository,
        private readonly equipmentLoanValidator: EquipmentLoanValidator,
    ) {}

    async execute(id: string, data: UpdateEquipmentLoanRequest): Promise<EquipmentLoanDTO> {
        const equipmentLoan = await this.equipmentLoanRepository.findById(id);
        if (!equipmentLoan) {
            throw new Error('El préstamo no existe');
        }

        if (data.status !== undefined) {
            this.equipmentLoanValidator.validateStatus(data.status);
        }

        if (data.member_id !== undefined) {
            await this.equipmentLoanValidator.validateMemberCanBorrow(data.member_id);
        }

        if (data.loan_date !== undefined) {
            this.equipmentLoanValidator.validateDateFormat(data.loan_date);
        }

        if (data.due_date !== undefined) {
            this.equipmentLoanValidator.validateDateFormat(data.due_date);
        }

        if (data.loan_date !== undefined || data.due_date !== undefined) {
            const loanDate = data.loan_date ?? equipmentLoan.loan_date;
            const dueDate = data.due_date ?? equipmentLoan.due_date;
            this.equipmentLoanValidator.validateLoanDates(loanDate, dueDate);
        }

        const updatedEquipmentLoan = await this.equipmentLoanRepository.update(id, data);
        return updatedEquipmentLoan;
    }
}
