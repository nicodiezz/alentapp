import { metrics } from '@opentelemetry/api';
import { FastifyRequest, FastifyReply } from 'fastify';
import { CreateEquipmentLoanUseCase } from '../application/NewEquipmentLoanUseCase.js';
import { UpdateEquipmentLoanUseCase } from '../application/UpdateEquipmentLoanUseCase.js';
import { GetEquipmentLoansUseCase } from '../application/GetEquipmentLoansUseCase.js';
import { DeleteEquipmentLoanUseCase } from '../application/DeleteEquipmentLoanUseCase.js';
import { CreateEquipmentLoanRequest, UpdateEquipmentLoanRequest } from '@alentapp/shared';

const meter = metrics.getMeter('alentapp-api');
const requestCounter = meter.createCounter('http.requests.total');
const errorCounter = meter.createCounter('http.requests.errors');
const requestDuration = meter.createHistogram('http.request.duration', {
    unit:
        'ms'
});

export class EquipmentLoanController {
    constructor(
        private readonly createEquipmentLoanUseCase: CreateEquipmentLoanUseCase,
        private readonly updateEquipmentLoanUseCase: UpdateEquipmentLoanUseCase,
        private readonly getEquipmentLoansUseCase: GetEquipmentLoansUseCase,
        private readonly deleteEquipmentLoanUseCase: DeleteEquipmentLoanUseCase,
    ) { }

    async create(
        request: FastifyRequest<{ Body: CreateEquipmentLoanRequest }>,
        reply: FastifyReply,
    ) {
        const start = Date.now();
        try {
            const equipmentLoan = await this.createEquipmentLoanUseCase.execute(request.body);
            requestCounter.add(1, { method: 'POST', route: '/equipment-loans', status: '201' });
            return reply.status(201).send({ data: equipmentLoan });
        } catch (error: any) {
            if (error.message.includes('El socio no existe')) {
                errorCounter.add(1, { method: 'POST', route: '/equipment-loans', status: '404' });
                return reply.status(404).send({ error: error.message });
            }
            if (
                error.message.includes('devolución esperada') ||
                error.message.includes('categoría del socio') ||
                error.message.includes('Formato de fecha inválido')
            ) {
                errorCounter.add(1, { method: 'POST', route: '/equipment-loans', status: '400' });
                return reply.status(400).send({ error: error.message });
            }
            errorCounter.add(1, { method: 'POST', route: '/equipment-loans', status: '500' });
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
        finally {
            requestDuration.record(Date.now() - start, { method: 'POST', route: '/equipment-loans' });
        }
    }

    async update(
        request: FastifyRequest<{ Params: { id: string }; Body: UpdateEquipmentLoanRequest }>,
        reply: FastifyReply,
    ) {
        const start = Date.now();
        try {
            const { id } = request.params;
            const equipmentLoan = await this.updateEquipmentLoanUseCase.execute(id, request.body);
            requestCounter.add(1, { method: 'PUT', route: '/equipment-loans', status: '200' });
            return reply.status(200).send({ data: equipmentLoan });
        } catch (error: any) {
            if (error.message.includes('El préstamo no existe')) {
                errorCounter.add(1, { method: 'PUT', route: '/equipment-loans', status: '404' });
                return reply.status(404).send({ error: error.message });
            }
            if (
                error.message.includes('estado del préstamo') ||
                error.message.includes('devolución esperada') ||
                error.message.includes('categoría del socio') ||
                error.message.includes('Formato de fecha inválido')
            ) {
                errorCounter.add(1, { method: 'PUT', route: '/equipment-loans', status: '400' });
                return reply.status(400).send({ error: error.message });
            }
            if (error.message.includes('El socio no existe')) {
                errorCounter.add(1, { method: 'PUT', route: '/equipment-loans', status: '404' });
                return reply.status(404).send({ error: error.message });
            }
            errorCounter.add(1, { method: 'PUT', route: '/equipment-loans', status: '500' });
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        } finally {
            requestDuration.record(Date.now() - start, { method: 'PUT', route: '/equipment-loans' });
        }
    }

    async getAll(_request: FastifyRequest, reply: FastifyReply) {
        const start = Date.now();
        try {
            const loans = await this.getEquipmentLoansUseCase.execute();
            requestCounter.add(1, { method: 'GET', route: '/equipment-loans', status: '200' });
            return reply.status(200).send({ data: loans });
        } catch (error: any) {
            errorCounter.add(1, { method: 'GET', route: '/equipment-loans', status: '500' });
            return reply.status(500).send({ error: error.message });
        } finally {
            requestDuration.record(Date.now() - start, { method: 'GET', route: '/equipment-loans' });
        }
    }

    async delete(
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply,
    ) {
        const start = Date.now();
        try {
            const { id } = request.params;
            await this.deleteEquipmentLoanUseCase.execute(id);
            requestCounter.add(1, { method: 'DELETE', route: '/equipment-loans', status: '204' });
            return reply.status(204).send();
        } catch (error: any) {
            if (error.message.includes('El préstamo de equipamiento no existe')) {
                errorCounter.add(1, { method: 'DELETE', route: '/equipment-loans', status: '404' });
                return reply.status(404).send({ error: error.message });
            }
            errorCounter.add(1, { method: 'DELETE', route: '/equipment-loans', status: '500' });
            return reply.status(500).send({ error: error.message });
        } finally {
            requestDuration.record(Date.now() - start, { method: 'DELETE', route: '/equipment-loans' });
        }
    }
}
