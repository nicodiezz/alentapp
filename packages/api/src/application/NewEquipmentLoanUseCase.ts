import { EquipmentLoanRepository } from '../domain/EquipmentLoanRepository.js';
import { EquipmentLoanValidator } from '../domain/services/EquipmentLoanValidator.js';
import { CreateEquipmentLoanRequest, EquipmentLoanDTO } from '@alentapp/shared';

export class CreateEquipmentLoanUseCase {
    constructor(
        private readonly equipmentLoanRepository: EquipmentLoanRepository,
        private readonly equipmentLoanValidator: EquipmentLoanValidator,
    ) {}

    async execute(data: CreateEquipmentLoanRequest): Promise<EquipmentLoanDTO> {
        this.equipmentLoanValidator.validateDateFormat(data.loan_date);
        this.equipmentLoanValidator.validateDateFormat(data.due_date);
        this.equipmentLoanValidator.validateLoanDates(data.loan_date, data.due_date);
        await this.equipmentLoanValidator.validateMemberCanBorrow(data.member_id);

        const equipmentLoan = await this.equipmentLoanRepository.create(data);
        return equipmentLoan;
    }
}
