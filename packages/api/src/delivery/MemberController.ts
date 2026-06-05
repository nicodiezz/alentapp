import { metrics } from '@opentelemetry/api';
import { FastifyRequest, FastifyReply } from 'fastify';
import { CreateMemberUseCase } from '../application/NewMemberUseCase.js';
import { GetMembersUseCase } from '../application/GetMembersUseCase.js';
import { UpdateMemberUseCase } from '../application/UpdateMemberUseCase.js';
import { DeleteMemberUseCase } from '../application/DeleteMemberUseCase.js';
import { CreateMemberRequest, UpdateMemberRequest } from '@alentapp/shared';

const meter = metrics.getMeter('alentapp-api');
const requestCounter = meter.createCounter('http.requests.total');
const errorCounter = meter.createCounter('http.requests.errors');
const requestDuration = meter.createHistogram('http.request.duration', {
    unit:
        'ms'
});


export class MemberController {
    constructor(
        private readonly createMemberUseCase: CreateMemberUseCase,
        private readonly getMembersUseCase: GetMembersUseCase,
        private readonly updateMemberUseCase: UpdateMemberUseCase,
        private readonly deleteMemberUseCase: DeleteMemberUseCase,
    ) { }

    async getAll(_request: FastifyRequest, reply: FastifyReply) {
        const start = Date.now();
        try {
            const socios = await this.getMembersUseCase.execute();
            requestCounter.add(1, { method: 'GET', route: '/socios', status: '200' });
            return reply.status(200).send({ data: socios });
        } catch (error: any) {
            errorCounter.add(1, { method: 'GET', route: '/socios', status: '500' });
            return reply.status(500).send({ error: error.message });
        } finally {
            requestDuration.record(Date.now() - start, { method: 'GET', route: '/socios' });
        }
    }

    async create(
        request: FastifyRequest<{ Body: CreateMemberRequest }>,
        reply: FastifyReply,
    ) {
        const start = Date.now();
        try {
            request.log.info('Alguien pegó al endpoint de ping');
            const socio = await this.createMemberUseCase.execute(request.body);
            requestCounter.add(1, { method: 'POST', route: '/socios', status: '201' });
            return reply.status(201).send({ data: socio });
        } catch (error: any) {
            if (error.message.includes('Ya existe un miembro con ese DNI')) {
                errorCounter.add(1, { method: 'POST', route: '/socios', status: '409' });
                return reply.status(409).send({ error: error.message });
            }
            if (error.message.includes('inválido')) {
                errorCounter.add(1, { method: 'POST', route: '/socios', status: '400' });
                return reply.status(400).send({ error: error.message });
            }
            return reply.status(500).send({ error: "Error interno, reintente más tarde" });
        } finally {
            requestDuration.record(Date.now() - start, { method: 'POST', route: '/socios' });
        }
    }

    async update(
        request: FastifyRequest<{ Params: { id: string }; Body: UpdateMemberRequest }>,
        reply: FastifyReply,
    ) {
        const start = Date.now();
        try {
            const { id } = request.params;
            const socio = await this.updateMemberUseCase.execute(id, request.body);
            requestCounter.add(1, { method: 'PUT', route: '/socios', status: '200' });
            return reply.status(200).send({ data: socio });
        } catch (error: any) {
            if (error.message.includes('Ya existe un miembro con ese DNI')) {
                errorCounter.add(1, { method: 'PUT', route: '/socios', status: '409' });
                return reply.status(409).send({ error: error.message });
            }
            if (error.message.includes('inválido') || error.message.includes('no existe')) {
                errorCounter.add(1, { method: 'PUT', route: '/socios', status: '400' });
                return reply.status(400).send({ error: error.message });
            }
            errorCounter.add(1, { method: 'PUT', route: '/socios', status: '500' });
            return reply.status(500).send({ error: "Error interno, reintente más tarde" });
        } finally {
            requestDuration.record(Date.now() - start, { method: 'PUT', route: '/socios' });
        }
    }

    async delete(
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply,
    ) {
        const start = Date.now();
        try {
            const { id } = request.params;
            await this.deleteMemberUseCase.execute(id);
            requestCounter.add(1, { method: 'DELETE', route: '/socios', status: '204' });
            return reply.status(204).send(); // No Content
        } catch (error: any) {
            errorCounter.add(1, { method: 'DELETE', route: '/socios', status: '400' });
            return reply.status(400).send({ error: error.message });
        } finally {
            requestDuration.record(Date.now() - start, { method: 'DELETE', route: '/socios' });
        }
    }
}
