import { FastifyRequest, FastifyReply } from 'fastify';
import { CreateDisciplineUseCase } from '../application/NewDisciplineUseCase.js';
import { GetDisciplinesUseCase } from '../application/GetDisciplinesUseCase.js';
import { UpdateDisciplineUseCase } from '../application/UpdateDisciplineUseCase.js';
import { DeleteDisciplineUseCase } from '../application/DeleteDisciplineUseCase.js';
import { CreateDisciplineRequest, UpdateDisciplineRequest } from '@alentapp/shared';

export class DisciplineController {
    constructor(
        private readonly createDisciplineUseCase: CreateDisciplineUseCase,
        private readonly getDisciplinesUseCase: GetDisciplinesUseCase,
        private readonly updateDisciplineUseCase: UpdateDisciplineUseCase,
        private readonly deleteDisciplineUseCase: DeleteDisciplineUseCase,
    ) {}

    async getAll(_request: FastifyRequest, reply: FastifyReply) {
        try {
            const suspensiones = await this.getDisciplinesUseCase.execute();
            return reply.status(200).send({ data: suspensiones });
        } catch (error: any) {
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }

    async create(
        request: FastifyRequest<{ Body: CreateDisciplineRequest }>,
        reply: FastifyReply,
    ) {
        try {
            const suspension = await this.createDisciplineUseCase.execute(request.body);
            return reply.status(201).send({ data: suspension });
        } catch (error: any) {
            if (error.message.includes('El miembro indicado no existe')) {
                return reply.status(404).send({ error: error.message });
            }
            if (error.message.includes('fecha de inicio')) {
                return reply.status(400).send({ error: error.message });
            }
            if (error.message.includes('Formato de fecha')) {
                return reply.status(400).send({ error: error.message });
            }
            return reply.status(500).send({ error: "Error interno, reintente más tarde" });
        }
    }

    async update(
        request: FastifyRequest<{ Params: { id: string }; Body: UpdateDisciplineRequest }>,
        reply: FastifyReply,
    ) {
        try {
            const { id } = request.params;
            const suspension = await this.updateDisciplineUseCase.execute(id, request.body);
            return reply.status(200).send({ data: suspension });
        } catch (error: any) {
            if (error.message.includes('La suspensión no existe')) {
                return reply.status(404).send({ error: error.message });
            }
            if (error.message.includes('El miembro indicado no existe')) {
                return reply.status(404).send({ error: error.message });
            }
            if (error.message.includes('fecha de inicio')) {
                return reply.status(400).send({ error: error.message });
            }
            if (error.message.includes('Formato de fecha')) {
                return reply.status(400).send({ error: error.message });
            }
            return reply.status(500).send({ error: "Error interno, reintente más tarde" });
        }
    }

    async delete(
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply,
    ) {
        try {
            const { id } = request.params;
            await this.deleteDisciplineUseCase.execute(id);
            return reply.status(204).send(); // No Content
        } catch (error: any) {
            if (error.message.includes('La suspensión no existe')) {
                return reply.status(404).send({ error: error.message });
            }
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }
}
