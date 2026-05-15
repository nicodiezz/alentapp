import { DisciplineRepository } from '../domain/DisciplineRepository.js';
import { DisciplineValidator } from '../domain/services/DisciplineValidator.js';
import { DisciplineDTO, CreateDisciplineRequest } from '@alentapp/shared';

export class CreateDisciplineUseCase {
    constructor(
        private readonly disciplineRepository: DisciplineRepository,
        private readonly disciplineValidator: DisciplineValidator,
    ) {}

    async execute(data: CreateDisciplineRequest): Promise<DisciplineDTO> {
        // 1. Validaciones de negocio (centralizadas)
        this.disciplineValidator.validateDateFormat(data.issue_date);
        this.disciplineValidator.validateDateFormat(data.expiry_date);
        this.disciplineValidator.validateDates(data.issue_date, data.expiry_date);
        await this.disciplineValidator.validateMemberExists(data.member_id);

        // 2. Persistencia a través de la interfaz (sin saber qué DB es)
        const nuevaSuspension = await this.disciplineRepository.create(data);

        return nuevaSuspension;
    }
}
