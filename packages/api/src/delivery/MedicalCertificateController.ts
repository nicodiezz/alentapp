import { metrics } from '@opentelemetry/api';
import { FastifyRequest, FastifyReply } from 'fastify';
import { CreateMedicalCertificateUseCase } from '../application/CreateMedicalCertificateUseCase.js';
import { GetMedicalCertificatesUseCase } from '../application/GetMedicalCertificateUseCase.js';
import { UpdateMedicalCertificateUseCase } from '../application/UpdateMedicalCertificateUseCase.js';
import { DeleteMedicalCertificateUseCase } from '../application/DeleteMedicalCertificateUseCase.js';
import { CreateMedicalCertificateRequest, UpdateMedicalCertificateRequest } from '@alentapp/shared';

const meter = metrics.getMeter('alentapp-api');
const requestCounter = meter.createCounter('http.requests.total');
const errorCounter = meter.createCounter('http.requests.errors');
const requestDuration = meter.createHistogram('http.request.duration', {
    unit:
        'ms'
});

export class MedicalCertificateController {
    constructor(
        private readonly createMedicalCertificateUseCase: CreateMedicalCertificateUseCase,
        private readonly getMedicalCertificatesUseCase: GetMedicalCertificatesUseCase,
        private readonly updateMedicalCertificateUseCase: UpdateMedicalCertificateUseCase,
        private readonly deleteMedicalCertificateUseCase: DeleteMedicalCertificateUseCase,
    ) { }

    async getAll(_request: FastifyRequest, reply: FastifyReply) {
        const start = Date.now();
        try {
            const certificates = await this.getMedicalCertificatesUseCase.execute();
            requestCounter.add(1, { method: 'GET', route: '/medical-certificates', status: '200' });
            return reply.status(200).send({ data: certificates });
        } catch (error: any) {
            errorCounter.add(1, { method: 'GET', route: '/medical-certificates', status: '500' });
            return reply.status(500).send({ error: error.message });
        } finally {
            requestDuration.record(Date.now() - start, { method: 'GET', route: '/medical-certificates' });
        }
    }

    async create(
        request: FastifyRequest<{ Body: CreateMedicalCertificateRequest }>,
        reply: FastifyReply,
    ) {
        const start = Date.now();
        try {
            const certificate = await this.createMedicalCertificateUseCase.execute(request.body);
            requestCounter.add(1, { method: 'POST', route: '/medical-certificates', status: '201' });
            return reply.status(201).send({ data: certificate });
        } catch (error: any) {
            if (error.message.includes('Todos los campos son requeridos')) {
                errorCounter.add(1, { method: 'POST', route: '/medical-certificates', status: '400' });
                return reply.status(400).send({ error: error.message });
            }
            if (error.message.includes('La fecha de vencimiento no puede ser previa a la fecha de emision')) {
                errorCounter.add(1, { method: 'POST', route: '/medical-certificates', status: '400' });
                return reply.status(400).send({ error: error.message });
            }
            if (error.message.includes('El socio indicado no existe')) {
                errorCounter.add(1, { method: 'POST', route: '/medical-certificates', status: '404' });
                return reply.status(404).send({ error: error.message });
            }
            errorCounter.add(1, { method: 'POST', route: '/medical-certificates', status: '500' });
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        } finally {
            requestDuration.record(Date.now() - start, { method: 'POST', route: '/medical-certificates' });
        }
    }

    async update(
        request: FastifyRequest<{ Params: { id: string }; Body: UpdateMedicalCertificateRequest }>,
        reply: FastifyReply,
    ) {
        const start = Date.now();
        try {
            const { id } = request.params;
            const certificate = await this.updateMedicalCertificateUseCase.execute(id, request.body);
            requestCounter.add(1, { method: 'PUT', route: '/medical-certificates', status: '200' });
            return reply.status(200).send({ data: certificate });
        } catch (error: any) {
            if (error.message.includes('El certificado no existe')) {
                errorCounter.add(1, { method: 'PUT', route: '/medical-certificates', status: '400' });
                return reply.status(400).send({ error: error.message });
            }
            if (error.message.includes('La fecha de vencimiento no puede ser previa a la fecha de emision')) {
                errorCounter.add(1, { method: 'PUT', route: '/medical-certificates', status: '400' });
                return reply.status(400).send({ error: error.message });
            }
            if (error.message.includes('Formato de fecha inválido')) {
                errorCounter.add(1, { method: 'PUT', route: '/medical-certificates', status: '400' });
                return reply.status(400).send({ error: error.message });
            }
            errorCounter.add(1, { method: 'PUT', route: '/medical-certificates', status: '500' });
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        } finally {
            requestDuration.record(Date.now() - start, { method: 'PUT', route: '/medical-certificates' });
        }
    }

    async delete(
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply,
    ) {
        const start = Date.now();
        try {
            const { id } = request.params;
            await this.deleteMedicalCertificateUseCase.execute(id);
            requestCounter.add(1, { method: 'DELETE', route: '/medical-certificates', status: '204' });
            return reply.status(204).send(); //204 no content
        } catch (error: any) {
            if (error.message.includes('El certificado no existe')) {
                errorCounter.add(1, { method: 'DELETE', route: '/medical-certificates', status: '400' });
                return reply.status(400).send({ error: error.message });
            }
            errorCounter.add(1, { method: 'DELETE', route: '/medical-certificates', status: '500' });
            return reply.status(500).send({ error: 'Error interno, reintente más tarde' });
        } finally {
            requestDuration.record(Date.now() - start, { method: 'DELETE', route: '/medical-certificates' });
        }
    }
}