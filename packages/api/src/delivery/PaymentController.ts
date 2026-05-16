import { FastifyRequest, FastifyReply } from 'fastify';
import { CreatePaymentUseCase } from '../application/NewPaymentUseCase.js';
import { CreatePaymentRequest } from '@alentapp/shared';
import { GetPaymentsUseCase } from '../application/GetPaymentsUseCase.js';

export class PaymentController {
    constructor(
        private readonly createPaymentUseCase: CreatePaymentUseCase,
        private readonly getPaymentsUseCase: GetPaymentsUseCase,

    ) { }

    async create(
        request: FastifyRequest<{ Body: CreatePaymentRequest }>,
        reply: FastifyReply,
    ) {
        try {
            const payment = await this.createPaymentUseCase.execute(request.body);
            return reply.status(201).send({ data: payment });
        } catch (error: any) {
            if (error.message.includes('inválido')) {
                return reply.status(400).send({ error: error.message });
            }
            if (error.message.includes('debe')) {
                return reply.status(400).send({ error: error.message });
            }
            if (error.message.includes('obligatoria')) {
                return reply.status(400).send({ error: error.message });
            }
            if (error.message.includes('No existe')) {
                return reply.status(404).send({ error: error.message });
            }
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }

    async findAll(
        request: FastifyRequest,
        reply: FastifyReply
    ) {
        try {
            const payments = await this.getPaymentsUseCase.execute();
            return reply.status(200).send({ data: payments });
        } catch (error: any) {
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }
}
