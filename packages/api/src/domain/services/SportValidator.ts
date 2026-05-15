import { CreateSportRequest } from '@alentapp/shared';
import { SportRepository } from '../SportRepository.js';

export class SportValidator {
    constructor(private readonly sportRepo: SportRepository) {}

    async validate(data: CreateSportRequest): Promise<void> {
        this.validateRequiredFields(data);
        this.validateMaxCapacity(data.max_capacity);
        await this.validateNameIsUnique(data.name);
    }

    private validateRequiredFields(data: CreateSportRequest): void {
        if (!data.name || data.name.trim() === '') {
            throw new Error('El nombre es requerido');
        }

        if (!data.description || data.description.trim() === '') {
            throw new Error('La descripción es requerida');
        }

        if (data.additional_price === undefined || data.additional_price === null) {
            throw new Error('El precio adicional es requerido');
        }

        if (data.requires_medical_certificate === undefined || data.requires_medical_certificate === null) {
            throw new Error('El certificado médico es requerido');
        }
    }

    private validateMaxCapacity(maxCapacity: number): void {
        if (!Number.isInteger(maxCapacity) || maxCapacity <= 0) {
            throw new Error('La capacidad máxima debe ser mayor a cero');
        }
    }

    private async validateNameIsUnique(name: string): Promise<void> {
        const sportWithSameName = await this.sportRepo.findByName(name.trim());
        if (sportWithSameName) {
            throw new Error('Ya existe un deporte con ese nombre');
        }
    }
}
