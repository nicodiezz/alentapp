import { FastifyReply, FastifyRequest } from 'fastify';
import { CreateLockerRequest } from '@alentapp/shared';
import { CreateLockerUseCase } from '../application/NewLockerUseCase.js';
import { GetLockersUseCase } from '../application/GetLockersUseCase.js';

export class LockerController {
    constructor(
        private readonly createLockerUseCase: CreateLockerUseCase,
        private readonly getLockersUseCase: GetLockersUseCase,
    ) {}

    async getAll(_request: FastifyRequest, reply: FastifyReply) {
        try {
            const casilleros = await this.getLockersUseCase.execute();
            return reply.status(200).send({ data: casilleros });
        } catch (error: any) {
            return reply.status(500).send({ error: error.message });
        }
    }

    async create(
        request: FastifyRequest<{ Body: CreateLockerRequest }>,
        reply: FastifyReply,
    ) {
        try {
            const casillero = await this.createLockerUseCase.execute(request.body);
            return reply.status(201).send({ data: casillero });
        } catch (error: any) {
            if (error.message.includes('Ya existe un casillero con ese número')) {
                return reply.status(409).send({ error: error.message });
            }
            if (
                error.message.includes('requerido') ||
                error.message.includes('debe ser numérico')
            ) {
                return reply.status(400).send({ error: error.message });
            }
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }
}
