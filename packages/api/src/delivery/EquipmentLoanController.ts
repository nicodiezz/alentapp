import { FastifyRequest, FastifyReply } from 'fastify';
import { CreateEquipmentLoanUseCase } from '../application/NewEquipmentLoanUseCase.js';
import { CreateEquipmentLoanRequest } from '@alentapp/shared';

export class EquipmentLoanController {
    constructor(
        private readonly createEquipmentLoanUseCase: CreateEquipmentLoanUseCase,
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
}
