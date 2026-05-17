import { EquipmentLoanRepository } from '../domain/EquipmentLoanRepository.js';
import { EquipmentLoanDTO } from '@alentapp/shared';

export class GetEquipmentLoansUseCase {
    constructor(private readonly equipmentLoanRepo: EquipmentLoanRepository) {}

    async execute(): Promise<EquipmentLoanDTO[]> {
        return this.equipmentLoanRepo.findAll();
    }
}