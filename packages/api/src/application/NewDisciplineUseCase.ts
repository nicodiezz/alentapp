import { DisciplineRepository } from '../domain/DisciplineRepository.js';
import { DisciplineValidator } from '../domain/services/DisciplineValidator.js';
import { MemberRepository } from '../domain/MemberRepository.js';
import { DisciplineDTO, CreateDisciplineRequest } from '@alentapp/shared';

export class CreateDisciplineUseCase {
    constructor(
        private readonly disciplineRepository: DisciplineRepository,
        private readonly disciplineValidator: DisciplineValidator,
        private readonly memberRepo: MemberRepository,
    ) {}

    async execute(data: CreateDisciplineRequest): Promise<DisciplineDTO> {
        const member = await this.memberRepo.findById(data.member_id);
        if (!member) {
            throw new Error('El miembro indicado no existe');
        }

        this.disciplineValidator.validateDateFormat(data.issue_date);
        this.disciplineValidator.validateDateFormat(data.expiry_date);
        this.disciplineValidator.validateDates(data.issue_date, data.expiry_date);

        const nuevaSuspension = await this.disciplineRepository.create(data);

        return nuevaSuspension;
    }
}
