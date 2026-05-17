import { LockerRepository } from '../domain/LockerRepository.js';

export class DeleteLockerUseCase {
    constructor(private readonly lockerRepository: LockerRepository) {}

    async execute(id: string): Promise<void> {
        const existingLocker = await this.lockerRepository.findById(id);
        if (!existingLocker) {
            throw new Error('El Locker no existe');
        }

        await this.lockerRepository.delete(id);
    }
}
