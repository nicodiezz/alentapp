import { FastifyRequest, FastifyReply } from 'fastify';
import { CreateMedicalCertificateUseCase } from '../application/CreateMedicalCertificateUseCase.js';
import { CreateMedicalCertificateRequest } from '@alentapp/shared';

export class MedicalCertificateController {
    constructor(
        private readonly createMedicalCertificateUseCase: CreateMedicalCertificateUseCase,
    ) {}

    async create(
        request: FastifyRequest<{ Body: CreateMedicalCertificateRequest }>,
        reply: FastifyReply,
    ) {
        try {
            const certificate = await this.createMedicalCertificateUseCase.execute(request.body);
            return reply.status(201).send({ data: certificate });
        } catch (error: any) {
            if (error.message.includes('Todos los campos son requeridos')) {
                return reply.status(400).send({ error: error.message });
            }
            if (error.message.includes('La fecha de emision debe ser previa a la fecha de vencimiento')) {
                return reply.status(400).send({ error: error.message });
            }
            if (error.message.includes('El socio indicado no existe')) {
                return reply.status(404).send({ error: error.message });
            }
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }
}