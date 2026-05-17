import { DisciplineRepository } from '../domain/DisciplineRepository.js';

export class DeleteDisciplineUseCase {
    constructor(private readonly disciplineRepo: DisciplineRepository) {}

    async execute(id: string): Promise<void> {
        // Validar existencia de la suspensión
        const existingDiscipline = await this.disciplineRepo.findById(id);
        if (!existingDiscipline) {
            throw new Error('La suspensión no existe');
        }

        // Ejecutar eliminación
        await this.disciplineRepo.delete(id);
    }
}
