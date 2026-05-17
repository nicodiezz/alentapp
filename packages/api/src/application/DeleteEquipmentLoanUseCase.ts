import { EquipmentLoanRepository } from '../domain/EquipmentLoanRepository.js';

export class DeleteEquipmentLoanUseCase {
    constructor(private readonly equipmentLoanRepository: EquipmentLoanRepository) {}

    async execute(id: string): Promise<void> {
        const existingEquipmentLoan = await this.equipmentLoanRepository.findById(id);
        if (!existingEquipmentLoan) {
            throw new Error('El préstamo de equipamiento no existe');
        }

        await this.equipmentLoanRepository.delete(id);
    }
}
