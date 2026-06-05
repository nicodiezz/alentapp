import { metrics } from '@opentelemetry/api';
import { FastifyRequest, FastifyReply } from 'fastify';
import { CreateDisciplineUseCase } from '../application/NewDisciplineUseCase.js';
import { GetDisciplinesUseCase } from '../application/GetDisciplinesUseCase.js';
import { UpdateDisciplineUseCase } from '../application/UpdateDisciplineUseCase.js';
import { DeleteDisciplineUseCase } from '../application/DeleteDisciplineUseCase.js';
import { CreateDisciplineRequest, UpdateDisciplineRequest } from '@alentapp/shared';

const meter = metrics.getMeter('alentapp-api');
const requestCounter = meter.createCounter('http.requests.total');
const errorCounter = meter.createCounter('http.requests.errors');
const requestDuration = meter.createHistogram('http.request.duration', {
    unit:
        'ms'
});

export class DisciplineController {
    constructor(
        private readonly createDisciplineUseCase: CreateDisciplineUseCase,
        private readonly getDisciplinesUseCase: GetDisciplinesUseCase,
        private readonly updateDisciplineUseCase: UpdateDisciplineUseCase,
        private readonly deleteDisciplineUseCase: DeleteDisciplineUseCase,
    ) { }

    async getAll(_request: FastifyRequest, reply: FastifyReply) {
        const start = Date.now();
        try {
            const suspensiones = await this.getDisciplinesUseCase.execute();
            requestCounter.add(1, { method: 'GET', route: '/disciplines', status: '200' });
            return reply.status(200).send({ data: suspensiones });
        } catch (error: any) {
            errorCounter.add(1, { method: 'GET', route: '/disciplines', status: '500' });
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        } finally {
            requestDuration.record(Date.now() - start, { method: 'GET', route: '/disciplines' });
        }
    }

    async create(
        request: FastifyRequest<{ Body: CreateDisciplineRequest }>,
        reply: FastifyReply,
    ) {
        const start = Date.now();
        try {
            const suspension = await this.createDisciplineUseCase.execute(request.body);
            requestCounter.add(1, { method: 'POST', route: '/disciplines', status: '201' });
            return reply.status(201).send({ data: suspension });
        } catch (error: any) {
            if (error.message.includes('El miembro indicado no existe')) {
                errorCounter.add(1, { method: 'POST', route: '/disciplines', status: '404' });
                return reply.status(404).send({ error: error.message });
            }
            if (error.message.includes('fecha de inicio')) {
                errorCounter.add(1, { method: 'POST', route: '/disciplines', status: '400' });
                return reply.status(400).send({ error: error.message });
            }
            if (error.message.includes('Formato de fecha')) {
                errorCounter.add(1, { method: 'POST', route: '/disciplines', status: '400' });
                return reply.status(400).send({ error: error.message });
            }
            errorCounter.add(1, { method: 'POST', route: '/disciplines', status: '500' });
            return reply.status(500).send({ error: "Error interno, reintente más tarde" });
        } finally {
            requestDuration.record(Date.now() - start, { method: 'POST', route: '/disciplines' });
        }
    }

    async update(
        request: FastifyRequest<{ Params: { id: string }; Body: UpdateDisciplineRequest }>,
        reply: FastifyReply,
    ) {
        const start = Date.now();
        try {
            const { id } = request.params;
            const suspension = await this.updateDisciplineUseCase.execute(id, request.body);
            requestCounter.add(1, { method: 'PUT', route: '/disciplines', status: '200' });
            return reply.status(200).send({ data: suspension });
        } catch (error: any) {
            if (error.message.includes('La suspensión no existe')) {
                errorCounter.add(1, { method: 'PUT', route: '/disciplines', status: '404' });
                return reply.status(404).send({ error: error.message });
            }
            if (error.message.includes('El miembro indicado no existe')) {
                errorCounter.add(1, { method: 'PUT', route: '/disciplines', status: '404' });
                return reply.status(404).send({ error: error.message });
            }
            if (error.message.includes('fecha de inicio')) {
                errorCounter.add(1, { method: 'PUT', route: '/disciplines', status: '400' });
                return reply.status(400).send({ error: error.message });
            }
            if (error.message.includes('Formato de fecha')) {
                errorCounter.add(1, { method: 'PUT', route: '/disciplines', status: '400' });
                return reply.status(400).send({ error: error.message });
            }
            errorCounter.add(1, { method: 'PUT', route: '/disciplines', status: '500' });
            return reply.status(500).send({ error: "Error interno, reintente más tarde" });
        } finally {
            requestDuration.record(Date.now() - start, { method: 'PUT', route: '/disciplines' });
        }
    }

    async delete(
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply,
    ) {
        const start = Date.now();
        try {
            const { id } = request.params;
            await this.deleteDisciplineUseCase.execute(id);
            requestCounter.add(1, { method: 'DELETE', route: '/disciplines', status: '204' });
            return reply.status(204).send(); // No Content
        } catch (error: any) {
            if (error.message.includes('La suspensión no existe')) {
                errorCounter.add(1, { method: 'DELETE', route: '/disciplines', status: '404' });
                return reply.status(404).send({ error: error.message });
            }
            errorCounter.add(1, { method: 'DELETE', route: '/disciplines', status: '500' });
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        } finally {
            requestDuration.record(Date.now() - start, { method: 'DELETE', route: '/disciplines' });
        }
    }
}
