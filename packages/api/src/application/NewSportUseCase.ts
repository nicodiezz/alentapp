import { CreateSportRequest, SportDTO } from '@alentapp/shared';
import { SportRepository } from '../domain/SportRepository.js';
import { SportValidator } from '../domain/services/SportValidator.js';

export class CreateSportUseCase {
    constructor(
        private readonly sportRepository: SportRepository,
        private readonly sportValidator: SportValidator
    ) {}

    async execute(data: CreateSportRequest): Promise<SportDTO> {
        await this.sportValidator.validate(data);

        const nuevoDeporte = await this.sportRepository.create({
            name: data.name.trim(),
            description: data.description.trim(),
            max_capacity: data.max_capacity,
            additional_price: data.additional_price,
            requires_medical_certificate: data.requires_medical_certificate,
        });

        return nuevoDeporte;
    }
}
