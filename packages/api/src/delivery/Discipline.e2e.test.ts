import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client/client.js';

describe('Discipline API End-to-End Tests', () => {
    let app: FastifyInstance;
    let prisma: PrismaClient;
    let testMemberId: string;
    let createdDisciplineId: string;

    const randomSuffix = Math.floor(Math.random() * 100000).toString();
    const testDni = `E2EDISC${randomSuffix}`;
    const testEmail = `e2edisc${randomSuffix}@test.com`;

    beforeAll(async () => {
        app = buildApp();
        await app.ready();

        prisma = new PrismaClient({
            adapter: new PrismaPg(process.env.DATABASE_URL as any),
        });
        await prisma.$connect();

        // Creamos un socio real en la DB para usarlo como FK en las suspensiones
        const member = await prisma.member.create({
            data: {
                name: 'Socio E2E Discipline',
                dni: testDni,
                email: testEmail,
                birthdate: new Date('2000-01-01'),
                category: 'Pleno',
            },
        });
        testMemberId = member.id;
    });

    afterAll(async () => {
        if (createdDisciplineId) {
            await prisma.discipline.deleteMany({ where: { id: createdDisciplineId } });
        }
        if (testMemberId) {
            await prisma.member.deleteMany({ where: { id: testMemberId } });
        }
        await prisma.$disconnect();
        await app.close();
    });

    it('1. GET: Debe retornar codigo 200 y la lista de suspensiones', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/api/v1/disciplines',
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(Array.isArray(body.data)).toBe(true);
    });

    it('2. POST: Debe crear una suspension en la base de datos real', async () => {
        const payload = {
            reason: 'Suspension E2E',
            issue_date: '2026-06-01',
            expiry_date: '2026-08-01',
            is_total_suspension: false,
            member_id: testMemberId,
        };

        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/disciplines',
            payload,
        });

        expect(response.statusCode).toBe(201);
        const body = JSON.parse(response.payload);

        expect(body.data.id).toBeDefined();
        expect(body.data.reason).toBe('Suspension E2E');
        expect(body.data.member_id).toBe(testMemberId);

        createdDisciplineId = body.data.id;

        // Verificación directa E2E: ¿Se guardó realmente en PostgreSQL?
        const dbDiscipline = await prisma.discipline.findUnique({ where: { id: createdDisciplineId } });
        expect(dbDiscipline).not.toBeNull();
        expect(dbDiscipline?.reason).toBe('Suspension E2E');
    });

    it('3. POST: Debe fallar con 404 si el miembro indicado no existe en la DB real', async () => {
        const payload = {
            reason: 'Miembro inexistente',
            issue_date: '2026-06-01',
            expiry_date: '2026-08-01',
            is_total_suspension: false,
            member_id: '00000000-0000-0000-0000-000000000000',
        };

        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/disciplines',
            payload,
        });

        expect(response.statusCode).toBe(404);
        const body = JSON.parse(response.payload);
        expect(body.error).toBe('El miembro indicado no existe');
    });

    it('4. POST: Debe fallar con 400 si la fecha de expiracion es previa a la de inicio', async () => {
        const payload = {
            reason: 'Fechas invertidas',
            issue_date: '2026-08-01',
            expiry_date: '2026-06-01',
            is_total_suspension: false,
            member_id: testMemberId,
        };

        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/disciplines',
            payload,
        });

        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.payload);
        expect(body.error).toBe('La fecha de fin de suspensión no puede ser previa a la fecha de inicio');
    });

    it('5. POST: Debe fallar con 400 si el formato de fecha es invalido', async () => {
        const payload = {
            reason: 'Fecha mal formada',
            issue_date: '2026-6-1',
            expiry_date: '2026-08-01',
            is_total_suspension: false,
            member_id: testMemberId,
        };

        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/disciplines',
            payload,
        });

        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.payload);
        expect(body.error).toBe('Formato de fecha inválido');
    });
});
