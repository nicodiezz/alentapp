import { FastifyRequest, FastifyReply } from 'fastify';
import { CreateMedicalCertificateUseCase } from '../application/CreateMedicalCertificateUseCase.js';
import { GetMedicalCertificatesUseCase } from '../application/GetMedicalCertificateUseCase.js';
import { UpdateMedicalCertificateUseCase } from '../application/UpdateMedicalCertificateUseCase.js';
import { DeleteMedicalCertificateUseCase } from '../application/DeleteMedicalCertificateUseCase.js';
import { CreateMedicalCertificateRequest, UpdateMedicalCertificateRequest } from '@alentapp/shared';

export class MedicalCertificateController {
    constructor(
        private readonly createMedicalCertificateUseCase: CreateMedicalCertificateUseCase,
        private readonly getMedicalCertificatesUseCase: GetMedicalCertificatesUseCase,
        private readonly updateMedicalCertificateUseCase: UpdateMedicalCertificateUseCase,
        private readonly deleteMedicalCertificateUseCase: DeleteMedicalCertificateUseCase,
    ) {}

    async getAll(_request: FastifyRequest, reply: FastifyReply) {
        try {
            const certificates = await this.getMedicalCertificatesUseCase.execute();
            return reply.status(200).send({ data: certificates });
        } catch (error: any) {
            return reply.status(500).send({ error: error.message });
        }
    }

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
            if (error.message.includes('La fecha de vencimiento no puede ser previa a la fecha de emision')) {
                return reply.status(400).send({ error: error.message });
            }
            if (error.message.includes('El socio indicado no existe')) {
                return reply.status(404).send({ error: error.message });
            }
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }

    async update(
        request: FastifyRequest<{ Params: { id: string }; Body: UpdateMedicalCertificateRequest }>,
        reply: FastifyReply,
    ) {
        try {
            const { id } = request.params;
            const certificate = await this.updateMedicalCertificateUseCase.execute(id, request.body);
            return reply.status(200).send({ data: certificate });
        } catch (error: any) {
            if (error.message.includes('El certificado no existe')) {
                return reply.status(400).send({ error: error.message });
            }
            if (error.message.includes('La fecha de vencimiento no puede ser previa a la fecha de emision')) {
                return reply.status(400).send({ error: error.message });
            }
            if (error.message.includes('Formato de fecha inválido')) {
                return reply.status(400).send({ error: error.message });
            }
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }

    async delete(
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply,
    ) {
        try {
            const { id } = request.params;
            await this.deleteMedicalCertificateUseCase.execute(id);
            return reply.status(204).send(); //204 no content
        } catch (error: any) {
            if (error.message.includes('El certificado no existe')) {
                return reply.status(400).send({ error: error.message });
            }
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        }
    }
}