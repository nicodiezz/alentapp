import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client/client.js';

describe('Medical Certificate API End-to-End Tests', () => {
    let app: FastifyInstance;
    let prisma: PrismaClient;
    let createdMemberId: string;
    let createdMedicalCertificateId: string;

    const randomSuffix = Math.floor(Math.random() * 100000).toString();
    const testDni = `MC-E2E-${randomSuffix}`;
    const testEmail = `medical-certificate-e2e-${randomSuffix}@test.com`;

    beforeAll(async () => {
        // 1. Levantamos la app entera (incluyendo PostgreSQL via el Repositorio original)
        app = buildApp();
        await app.ready();

        // 2. Instanciamos Prisma independientemente para comprobar la Base de Datos
        prisma = new PrismaClient({
            adapter: new PrismaPg(process.env.DATABASE_URL as any),
        });

        await prisma.$connect();

        //para realizar correctamente los tests POST debe existir un miembro para poder usar su FK
        const member = await prisma.member.create({
            data: {
                name: 'Socio E2E Medical Certificate',
                dni: testDni,
                email: testEmail,
                birthdate: new Date('2000-01-01'),
                category: 'Pleno',
            },
        });

        createdMemberId = member.id;
    });

    afterAll(async () => {
        // borrar todos los certificados del miembro
        if (createdMemberId) {
            await prisma.medicalCertificate.deleteMany({
                where: { member_id: createdMemberId },
            });

            await prisma.member.deleteMany({
                where: { id: createdMemberId },
            });
        }

        await prisma.$disconnect();
        await app.close();
    });

    it('1. GET: Debe retornar la lista de certificados médicos existente', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/api/v1/medical-certificates',
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(Array.isArray(body.data)).toBe(true);
    });

    it('2. POST: Debe crear un certificado médico en la base de datos real', async () => {
        const payload = {
            issue_date: '2026-01-01',
            expiry_date: '2026-12-31',
            doctor_license: 'MP-123456',
            member_id: createdMemberId,
        };

        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/medical-certificates',
            payload,
        });

        expect(response.statusCode).toBe(201);
        const body = JSON.parse(response.payload);

        expect(body.data.id).toBeDefined();
        expect(body.data.doctor_license).toBe('MP-123456');

        // Guardamos el ID para reutilizar en los siguientes tests
        createdMedicalCertificateId = body.data.id;

        // Verificación directa E2E: ¿Se guardó realmente en PostgreSQL?
        const dbMedicalCertificate = await prisma.medicalCertificate.findUnique({
            where: { id: createdMedicalCertificateId },
        });

        expect(dbMedicalCertificate).not.toBeNull();
        expect(dbMedicalCertificate?.doctor_license).toBe('MP-123456');
    });

    it('3. POST: Debe invalidar el certificado activo anterior antes de crear uno nuevo', async () => {
        await prisma.medicalCertificate.update({
            where: { id: createdMedicalCertificateId },
            data: {
                is_validated: true, //establece el registro como true
            },
        });

        const payload = {
            issue_date: '2027-01-01',
            expiry_date: '2027-12-31',
            doctor_license: 'MP-999999',
            member_id: createdMemberId,
        };

        //crea nuevo certificado para el mismo medico
        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/medical-certificates',
            payload,
        });

        expect(response.statusCode).toBe(201);
        const body = JSON.parse(response.payload);

        //busca el certificado previo y verifica que se haya invalidado
        const previousMedicalCertificate = await prisma.medicalCertificate.findUnique({
            where: { id: createdMedicalCertificateId },
        });
        expect(previousMedicalCertificate?.is_validated).toBe(false);

        //actualiza variable global con el ID del nuevo certificado para futuras pruebas
		createdMedicalCertificateId = body.data.id;

		//busca el nuevo certificado recien insertado directamente en la bd para verificar existencia
		const newMedicalCertificate = await prisma.medicalCertificate.findUnique({
			where: { id: createdMedicalCertificateId },
		});

		expect(newMedicalCertificate).not.toBeNull();
		expect(newMedicalCertificate?.doctor_license).toBe('MP-999999');
	});

    it('4. POST: Debe fallar si expiry_date es anterior a issue_date', async () => {
        const payload = {
            issue_date: '2028-12-31',
            expiry_date: '2026-01-01',
            doctor_license: 'MP-ERROR',
            member_id: createdMemberId,
        };

        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/medical-certificates',
            payload,
        });

        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.payload);
        expect(body.error).toBe('La fecha de vencimiento no puede ser previa a la fecha de emision');
    });

    it('5. PUT: Debe actualizar el certificado médico modificando la base de datos', async () => {
        const updatePayload = {
            doctor_license: 'MP-UPDATED',
            is_validated: true,
        };

        const response = await app.inject({
            method: 'PUT',
            url: `/api/v1/medical-certificates/${createdMedicalCertificateId}`,
            payload: updatePayload,
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body.data.doctor_license).toBe('MP-UPDATED');
        expect(body.data.is_validated).toBe(true);

        // Verificar directamente en PostgreSQL que los campos se modificaron
        const dbMedicalCertificate = await prisma.medicalCertificate.findUnique({
            where: { id: createdMedicalCertificateId },
        });
        expect(dbMedicalCertificate?.doctor_license).toBe('MP-UPDATED');
        expect(dbMedicalCertificate?.is_validated).toBe(true);
    });

    it('6. PUT: Debe fallar si expiry_date es anterior a issue_date', async () => {
        const updatePayload = {
            issue_date: '2026-12-31',
            expiry_date: '2026-01-01',
        };

        const response = await app.inject({
            method: 'PUT',
            url: `/api/v1/medical-certificates/${createdMedicalCertificateId}`,
            payload: updatePayload,
        });

        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.payload);
        expect(body.error).toBe('La fecha de vencimiento no puede ser previa a la fecha de emision');
    });

    it('7. DELETE: Debe eliminar físicamente el certificado médico de la base de datos', async () => {
        const response = await app.inject({
            method: 'DELETE',
            url: `/api/v1/medical-certificates/${createdMedicalCertificateId}`,
        });

        expect(response.statusCode).toBe(204);

        // Verificar que Prisma ya no encuentra el certificado
        const dbMedicalCertificate = await prisma.medicalCertificate.findUnique({
            where: { id: createdMedicalCertificateId },
        });
        expect(dbMedicalCertificate).toBeNull();

        // Anular variable para evitar doble borrado en afterAll
        createdMedicalCertificateId = '';
    });
});