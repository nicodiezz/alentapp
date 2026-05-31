import { FastifyReply, FastifyRequest } from 'fastify';
import { CreateLockerRequest, UpdateLockerRequest } from '@alentapp/shared';
import { CreateLockerUseCase } from '../application/NewLockerUseCase.js';
import { GetLockersUseCase } from '../application/GetLockersUseCase.js';
import { UpdateLockerUseCase } from '../application/UpdateLockerUseCase.js';
import { DeleteLockerUseCase } from '../application/DeleteLockerUseCase.js';

export class LockerController {
    constructor(
        private readonly createLockerUseCase: CreateLockerUseCase,
        private readonly getLockersUseCase: GetLockersUseCase,
        private readonly updateLockerUseCase: UpdateLockerUseCase,
        private readonly deleteLockerUseCase: DeleteLockerUseCase,
    ) {}

    async getAll(_request: FastifyRequest, reply: FastifyReply) {
        try {
            const lockers = await this.getLockersUseCase.execute();
            return reply.status(200).send({ data: lockers });
        } catch (error: any) {
            return reply.status(500).send({ error: error.message });
        }
    }

    async create(
        request: FastifyRequest<{ Body: CreateLockerRequest }>,
        reply: FastifyReply,
    ) {
        try {
            const locker = await this.createLockerUseCase.execute(request.body);
            return reply.status(201).send({ data: locker });
        } catch (error: any) {
            if (error.message.includes('Ya existe un casillero')) {
                return reply.status(409).send({ error: error.message });
            }
            if (
                error.message.includes('requerido') ||
                error.message.includes('requerida') ||
                error.message.includes('debe ser')
            ) {
                return reply.status(400).send({ error: error.message });
            }
            return reply.status(500).send({ error: 'Error interno, reintente mas tarde' });
        }
    }

    async update(
        request: FastifyRequest<{ Params: { id: string }; Body: UpdateLockerRequest }>,
        reply: FastifyReply,
    ) {
        try {
            const { id } = request.params;
            const locker = await this.updateLockerUseCase.execute(id, request.body);
            return reply.status(200).send({ data: locker });
        } catch (error: any) {
            if (
                error.message.includes('El casillero no existe') ||
                error.message.includes('El miembro indicado no existe')
            ) {
                return reply.status(404).send({ error: error.message });
            }
            if (
                error.message.includes('Ya existe un casillero') ||
                error.message.includes('No se puede asignar un casillero en mantenimiento')
            ) {
                return reply.status(409).send({ error: error.message });
            }
            if (
                error.message.includes('requerida') ||
                error.message.includes('debe ser')
            ) {
                return reply.status(400).send({ error: error.message });
            }
            return reply.status(500).send({ error: 'Error interno, reintente mas tarde' });
        }
    }

    async delete(
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply,
    ) {
        try {
            const { id } = request.params;
            await this.deleteLockerUseCase.execute(id);
            return reply.status(204).send();
        } catch (error: any) {
            if (error.message.includes('El Locker no existe')) {
                return reply.status(404).send({ error: error.message });
            }
            return reply.status(400).send({ error: error.message });
        }
    }
}
