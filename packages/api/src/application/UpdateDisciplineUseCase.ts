import { DisciplineRepository } from '../domain/DisciplineRepository.js';
import { DisciplineValidator } from '../domain/services/DisciplineValidator.js';
import { MemberRepository } from '../domain/MemberRepository.js';
import { DisciplineDTO, UpdateDisciplineRequest } from '@alentapp/shared';

export class UpdateDisciplineUseCase {
    constructor(
        private readonly disciplineRepo: DisciplineRepository,
        private readonly disciplineValidator: DisciplineValidator,
        private readonly memberRepo: MemberRepository,
    ) {}

    async execute(id: string, data: UpdateDisciplineRequest): Promise<DisciplineDTO> {
        // Validar existencia de la suspensión
        const existingDiscipline = await this.disciplineRepo.findById(id);
        if (!existingDiscipline) {
            throw new Error('La suspensión no existe');
        }

        // Validar fechas contra el estado final aunque se actualice solo una de ellas.
        if (data.issue_date || data.expiry_date) {
            if (data.issue_date) {
                this.disciplineValidator.validateDateFormat(data.issue_date);
            }
            if (data.expiry_date) {
                this.disciplineValidator.validateDateFormat(data.expiry_date);
            }

            const finalStartDate = data.issue_date ?? existingDiscipline.issue_date;
            const finalEndDate = data.expiry_date ?? existingDiscipline.expiry_date;
            this.disciplineValidator.validateDates(finalStartDate, finalEndDate);
        }

        if (data.member_id && data.member_id !== existingDiscipline.member_id) {
            const member = await this.memberRepo.findById(data.member_id);
            if (!member) {
                throw new Error('El miembro indicado no existe');
            }
        }

        return this.disciplineRepo.update(id, data);
    }
}
