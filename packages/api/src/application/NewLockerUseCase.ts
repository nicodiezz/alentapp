import { CreateLockerRequest, LockerDTO } from '@alentapp/shared';
import { LockerRepository } from '../domain/LockerRepository.js';
import { LockerValidator } from '../domain/services/LockerValidator.js';

export class CreateLockerUseCase {
    constructor(
        private readonly lockerRepository: LockerRepository,
        private readonly lockerValidator: LockerValidator
    ) {}

    async execute(data: CreateLockerRequest): Promise<LockerDTO> {
        await this.lockerValidator.validate(data);

        const newLocker = await this.lockerRepository.create({
            number: data.number,
            location: data.location.trim(),
        });

        return newLocker;
    }
}
