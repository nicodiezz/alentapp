import { CreateLockerRequest, UpdateLockerRequest } from '@alentapp/shared';
import { LockerRepository } from '../LockerRepository.js';

export class LockerValidator {
    constructor(private readonly lockerRepo: LockerRepository) {}

    async validate(data: CreateLockerRequest): Promise<void> {
        this.validateRequiredFields(data);
        this.validateNumber(data.number);
        await this.validateNumberIsUnique(data.number);
    }

    async validateUpdate(id: string, data: UpdateLockerRequest): Promise<void> {
        if (data.number !== undefined) {
            this.validateNumber(data.number);
            await this.validateNumberIsUnique(data.number, id);
        }

        if (data.location !== undefined && data.location.trim() === '') {
            throw new Error('La ubicación es requerida');
        }
    }

    private validateRequiredFields(data: CreateLockerRequest): void {
        if (data.number === undefined || data.number === null) {
            throw new Error('El número de casillero es requerido');
        }

        if (!data.location || data.location.trim() === '') {
            throw new Error('La ubicación es requerida');
        }
    }

    private validateNumber(number: number): void {
        if (!Number.isInteger(number)) {
            throw new Error('El número de casillero debe ser numérico');
        }
    }

    private async validateNumberIsUnique(number: number, currentLockerId?: string): Promise<void> {
        const lockerWithSameNumber = await this.lockerRepo.findByNumber(number);
        if (lockerWithSameNumber && lockerWithSameNumber.id !== currentLockerId) {
            throw new Error('Ya existe un casillero con ese número');
        }
    }
}
