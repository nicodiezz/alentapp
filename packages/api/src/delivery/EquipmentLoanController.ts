import { FastifyRequest, FastifyReply } from 'fastify';
import { CreateEquipmentLoanUseCase } from '../application/NewEquipmentLoanUseCase.js';
import { UpdateEquipmentLoanUseCase } from '../application/UpdateEquipmentLoanUseCase.js';
import { CreateEquipmentLoanRequest, UpdateEquipmentLoanRequest } from '@alentapp/shared';

export class EquipmentLoanController {
    constructor(
        private readonly createEquipmentLoanUseCase: CreateEquipmentLoanUseCase,
        private readonly updateEquipmentLoanUseCase: UpdateEquipmentLoanUseCase,
    ) {}

    async create(
        request: FastifyRequest<{ Body: CreateEquipmentLoanRequest }>,
        reply: FastifyReply,
    ) {
        try {
            const equipmentLoan = await this.createEquipmentLoanUseCase.execute(request.body);
            return reply.status(201).send({ data: equipmentLoan });
        } catch (error: any) {
            if (error.message.includes('El socio no existe')) {
                return reply.status(404).send({ error: error.message });
            }
            if (
                error.message.includes('devolución esperada') ||
                error.message.includes('categoría del socio') ||
                error.message.includes('Formato de fecha inválido')
            ) {
                return reply.status(400).send({ error: error.message });
            }
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }

    async update(
        request: FastifyRequest<{ Params: { id: string }; Body: UpdateEquipmentLoanRequest }>,
        reply: FastifyReply,
    ) {
        try {
            const { id } = request.params;
            const equipmentLoan = await this.updateEquipmentLoanUseCase.execute(id, request.body);
            return reply.status(200).send({ data: equipmentLoan });
        } catch (error: any) {
            if (error.message.includes('El préstamo no existe')) {
                return reply.status(404).send({ error: error.message });
            }
            if (
                error.message.includes('estado del préstamo') ||
                error.message.includes('devolución esperada') ||
                error.message.includes('categoría del socio') ||
                error.message.includes('Formato de fecha inválido')
            ) {
                return reply.status(400).send({ error: error.message });
            }
            if (error.message.includes('El socio no existe')) {
                return reply.status(404).send({ error: error.message });
            }
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }
}
