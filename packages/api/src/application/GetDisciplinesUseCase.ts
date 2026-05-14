import { DisciplineRepository } from '../domain/DisciplineRepository.js';
import { DisciplineDTO } from '@alentapp/shared';

export class GetDisciplinesUseCase {
    constructor(private readonly disciplineRepo: DisciplineRepository) {}

    async execute(): Promise<DisciplineDTO[]> {
        return this.disciplineRepo.findAll();
    }
}
