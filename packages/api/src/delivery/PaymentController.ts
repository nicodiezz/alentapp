import { metrics } from '@opentelemetry/api';
import { FastifyRequest, FastifyReply } from 'fastify';
import { CreatePaymentUseCase } from '../application/NewPaymentUseCase.js';
import { CreatePaymentRequest, UpdatePaymentRequest } from '@alentapp/shared';
import { GetPaymentsUseCase } from '../application/GetPaymentsUseCase.js';
import { GetPaymentByIdUseCase } from '../application/GetPaymentUseCase.js';
import { UpdatePaymentUseCase } from '../application/UpdatePaymentUseCase.js';
import { CancelPaymentUseCase } from '../application/CancelPaymentUseCase.js';

const meter = metrics.getMeter('alentapp-api');
const requestCounter = meter.createCounter('http.requests.total');
const errorCounter = meter.createCounter('http.requests.errors');
const requestDuration = meter.createHistogram('http.request.duration', {
    unit:
        'ms'
});

export class PaymentController {
    constructor(
        private readonly createPaymentUseCase: CreatePaymentUseCase,
        private readonly getPaymentsUseCase: GetPaymentsUseCase,
        private readonly getPaymentByIdUseCase: GetPaymentByIdUseCase,
        private readonly updatePaymentUseCase: UpdatePaymentUseCase,
        private readonly cancelPaymentUseCase: CancelPaymentUseCase,
    ) { }

    async create(
        request: FastifyRequest<{ Body: CreatePaymentRequest }>,
        reply: FastifyReply,
    ) {
        const start = Date.now();
        try {
            const payment = await this.createPaymentUseCase.execute(request.body);
            requestCounter.add(1, { method: 'POST', route: '/payments', status: '201' });

            return reply.status(201).send({ data: payment });
        } catch (error: any) {
            if (error.message.includes('inválido')) {
                errorCounter.add(1, { method: 'POST', route: '/payments', status: '400' });
                return reply.status(400).send({ error: error.message });
            }
            if (error.message.includes('debe')) {
                errorCounter.add(1, { method: 'POST', route: '/payments', status: '400' });
                return reply.status(400).send({ error: error.message });
            }
            if (error.message.includes('obligatoria')) {
                errorCounter.add(1, { method: 'POST', route: '/payments', status: '400' });
                return reply.status(400).send({ error: error.message });
            }
            if (error.message.includes('No existe')) {
                errorCounter.add(1, { method: 'POST', route: '/payments', status: '404' });
                return reply.status(404).send({ error: error.message });
            }
            errorCounter.add(1, { method: 'POST', route: '/payments', status: '500' });
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        } finally {
            requestDuration.record(Date.now() - start, { method: 'POST', route: '/payments' });
        }
    }

    async findAll(
        request: FastifyRequest,
        reply: FastifyReply
    ) {
        const start = Date.now();
        try {
            const payments = await this.getPaymentsUseCase.execute();
            requestCounter.add(1, { method: 'GET', route: '/payments', status: '200' });
            return reply.status(200).send({ data: payments });
        } catch (error: any) {
            errorCounter.add(1, { method: 'GET', route: '/payments', status: '500' });
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        } finally {
            requestDuration.record(Date.now() - start, { method: 'GET', route: '/payments' });
        }
    }

    async findById(
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply,
    ) {
        const start = Date.now();
        try {
            const payment = await this.getPaymentByIdUseCase.execute(request.params.id);
            requestCounter.add(1, { method: 'GET', route: '/payments', status: '200' });
            return reply.status(200).send({ data: payment });
        } catch (error: any) {
            if (error.message.includes('No existe')) {
                errorCounter.add(1, { method: 'GET', route: '/payments', status: '404' });
                return reply.status(404).send({ error: error.message });
            }
            errorCounter.add(1, { method: 'GET', route: '/payments', status: '500' });
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        } finally {
            requestDuration.record(Date.now() - start, { method: 'GET', route: '/payments' });
        }
    }

    async update(
        request: FastifyRequest<{ Params: { id: string }; Body: UpdatePaymentRequest }>,
        reply: FastifyReply,
    ) {
        const start = Date.now();
        try {
            const payment = await this.updatePaymentUseCase.execute(request.params.id, request.body);
            requestCounter.add(1, { method: 'PUT', route: '/payments', status: '200' });
            return reply.status(200).send({ data: payment });
        } catch (error: any) {
            if (error.message.includes('inválido')) {
                errorCounter.add(1, { method: 'PUT', route: '/payments', status: '400' });
                return reply.status(400).send({ error: error.message });
            }
            if (error.message.includes('debe')) {
                errorCounter.add(1, { method: 'PUT', route: '/payments', status: '400' });
                return reply.status(400).send({ error: error.message });
            }
            if (error.message.includes('obligatoria')) {
                errorCounter.add(1, { method: 'PUT', route: '/payments', status: '400' });
                return reply.status(400).send({ error: error.message });
            }
            if (error.message.includes('No existe')) {
                errorCounter.add(1, { method: 'PUT', route: '/payments', status: '404' });
                return reply.status(404).send({ error: error.message });
            }
            errorCounter.add(1, { method: 'PUT', route: '/payments', status: '500' });
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        } finally {
            requestDuration.record(Date.now() - start, { method: 'PUT', route: '/payments' });
        }
    }

    async cancel(
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply,
    ) {
        const start = Date.now();
        try {
            const payment = await this.cancelPaymentUseCase.execute(request.params.id);
            requestCounter.add(1, { method: 'DELETE', route: '/payments', status: '204' });
            return reply.status(204).send();
        } catch (error: any) {
            if (error.message.includes('El pago ya se encuentra cancelado')) {
                errorCounter.add(1, { method: 'DELETE', route: '/payments', status: '409' });
                return reply.status(409).send({ error: error.message });
            }
            if (error.message.includes('No existe')) {
                errorCounter.add(1, { method: 'DELETE', route: '/payments', status: '404' });
                return reply.status(404).send({ error: error.message });
            }
            errorCounter.add(1, { method: 'DELETE', route: '/payments', status: '500' });
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        } finally {
            requestDuration.record(Date.now() - start, { method: 'DELETE', route: '/payments' });
        }
    }
}
