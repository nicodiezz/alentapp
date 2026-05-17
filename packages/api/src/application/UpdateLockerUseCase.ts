import { LockerDTO, UpdateLockerRequest } from '@alentapp/shared';
import { LockerRepository } from '../domain/LockerRepository.js';
import { LockerValidator } from '../domain/services/LockerValidator.js';
import { MemberRepository } from '../domain/MemberRepository.js';

export class UpdateLockerUseCase {
    constructor(
        private readonly lockerRepository: LockerRepository,
        private readonly lockerValidator: LockerValidator,
        private readonly memberRepository: MemberRepository,
    ) {}

    async execute(id: string, data: UpdateLockerRequest): Promise<LockerDTO> {
        const existingLocker = await this.lockerRepository.findById(id);
        if (!existingLocker) {
            throw new Error('El casillero no existe');
        }

        await this.lockerValidator.validateUpdate(id, data);

        if (data.member_id && data.member_id !== existingLocker.member_id) {
            const member = await this.memberRepository.findById(data.member_id);
            if (!member) {
                throw new Error('El miembro indicado no existe');
            }
        }

        const finalStatus = data.status ?? existingLocker.status;
        const finalMemberId = data.member_id !== undefined ? data.member_id : existingLocker.member_id;
        if (finalStatus === 'Maintenance' && finalMemberId) {
            throw new Error('No se puede asignar un casillero en mantenimiento');
        }

        return this.lockerRepository.update(id, data);
    }
}
