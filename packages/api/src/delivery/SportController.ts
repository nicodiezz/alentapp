import { metrics } from '@opentelemetry/api';
import { FastifyReply, FastifyRequest } from 'fastify';
import { CreateSportRequest, UpdateSportRequest } from '@alentapp/shared';
import { CreateSportUseCase } from '../application/NewSportUseCase.js';
import { GetSportsUseCase } from '../application/GetSportsUseCase.js';
import { UpdateSportUseCase } from '../application/UpdateSportUseCase.js';
import { DeleteSportUseCase } from '../application/DeleteSportUseCase.js';


const meter = metrics.getMeter('alentapp-api');
const requestCounter = meter.createCounter('http.requests.total');
const errorCounter = meter.createCounter('http.requests.errors');
const requestDuration = meter.createHistogram('http.request.duration', {
    unit:
        'ms'
});

export class SportController {
    constructor(
        private readonly createSportUseCase: CreateSportUseCase,
        private readonly getSportsUseCase: GetSportsUseCase,
        private readonly updateSportUseCase: UpdateSportUseCase,
        private readonly deleteSportUseCase: DeleteSportUseCase,
    ) { }

    async getAll(_request: FastifyRequest, reply: FastifyReply) {
        const start = Date.now();
        try {
            const deportes = await this.getSportsUseCase.execute();
            requestCounter.add(1, { method: 'GET', route: '/sports', status: '200' });
            return reply.status(200).send({ data: deportes });
        } catch (error: any) {
            errorCounter.add(1, { method: 'GET', route: '/sports', status: '500' });
            return reply.status(500).send({ error: error.message });
        } finally {
            requestDuration.record(Date.now() - start, { method: 'GET', route: '/sports' });
        }
    }

    async create(
        request: FastifyRequest<{ Body: CreateSportRequest }>,
        reply: FastifyReply,
    ) {
        const start = Date.now();
        try {
            const deporte = await this.createSportUseCase.execute(request.body);
            requestCounter.add(1, { method: 'POST', route: '/sports', status: '201' });
            return reply.status(201).send({ data: deporte });
        } catch (error: any) {
            if (error.message.includes('Ya existe un deporte con ese nombre')) {
                errorCounter.add(1, { method: 'POST', route: '/sports', status: '409' });
                return reply.status(409).send({ error: error.message });
            }
            if (
                error.message.includes('requerido') ||
                error.message.includes('capacidad máxima')
            ) {
                errorCounter.add(1, { method: 'POST', route: '/sports', status: '400' });
                return reply.status(400).send({ error: error.message });
            }
            errorCounter.add(1, { method: 'POST', route: '/sports', status: '500' });
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        } finally {
            requestDuration.record(Date.now() - start, { method: 'POST', route: '/sports' });
        }
    }

    async update(
        request: FastifyRequest<{ Params: { id: string }; Body: UpdateSportRequest }>,
        reply: FastifyReply,
    ) {
        const start = Date.now();
        try {
            const { id } = request.params;
            const deporte = await this.updateSportUseCase.execute(id, request.body);
            requestCounter.add(1, { method: 'PUT', route: '/sports', status: '200' });
            return reply.status(200).send({ data: deporte });
        } catch (error: any) {
            if (error.message.includes('El deporte no existe')) {
                errorCounter.add(1, { method: 'PUT', route: '/sports', status: '404' });
                return reply.status(404).send({ error: error.message });
            }
            if (
                error.message.includes('no puede modificarse') ||
                error.message.includes('capacidad máxima')
            ) {
                errorCounter.add(1, { method: 'PUT', route: '/sports', status: '400' });
                return reply.status(400).send({ error: error.message });
            }
            errorCounter.add(1, { method: 'PUT', route: '/sports', status: '500' });
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        } finally {
            requestDuration.record(Date.now() - start, { method: 'PUT', route: '/sports' });
        }
    }

    async delete(
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply,
    ) {
        const start = Date.now();
        try {
            const { id } = request.params;
            await this.deleteSportUseCase.execute(id);
            requestCounter.add(1, { method: 'DELETE', route: '/sports', status: '204' });
            return reply.status(204).send();
        } catch (error: any) {
            if (error.message.includes('El deporte no existe')) {
                errorCounter.add(1, { method: 'DELETE', route: '/sports', status: '404' });
                return reply.status(404).send({ error: error.message });
            }
            errorCounter.add(1, { method: 'DELETE', route: '/sports', status: '500' });
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        } finally {
            requestDuration.record(Date.now() - start, { method: 'DELETE', route: '/sports' });
        }
    }
}
