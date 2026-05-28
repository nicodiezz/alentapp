import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client/client.js';

describe('EquipmentLoan API End-to-End Tests', () => {
    let app: FastifyInstance;
    let prisma: PrismaClient;
    let createdLoanId: string;
    let plenoMemberId: string;
    let cadeteMemberId: string;

    // Generamos un sufijo aleatorio para que los datos insertados
    // no colisionen con los datos de desarrollo existentes.
    const randomSuffix = Math.floor(Math.random() * 100000).toString();

    beforeAll(async () => {
        // 1. Levantamos la app entera (incluyendo PostgreSQL via el Repositorio original)
        app = buildApp();
        await app.ready();

        // 2. Instanciamos Prisma independientemente para comprobar la Base de Datos
        prisma = new PrismaClient({
            adapter: new PrismaPg(process.env.DATABASE_URL as any),
        });
        await prisma.$connect();

        // 3. Creamos los miembros que vamos a necesitar para los préstamos.
        //    Un miembro Pleno (habilitado) y uno Cadete (no habilitado).
        const plenoMember = await prisma.member.create({
            data: {
                dni: `ELP${randomSuffix}`,
                name: 'Pleno E2E Loan',
                email: `pleno-loan-${randomSuffix}@test.com`,
                birthdate: new Date('1990-01-01'),
                category: 'Pleno',
            },
        });
        plenoMemberId = plenoMember.id;

        const cadeteMember = await prisma.member.create({
            data: {
                dni: `ELC${randomSuffix}`,
                name: 'Cadete E2E Loan',
                email: `cadete-loan-${randomSuffix}@test.com`,
                birthdate: new Date('2015-01-01'),
                category: 'Cadete',
            },
        });
        cadeteMemberId = cadeteMember.id;
    });

    afterAll(async () => {
        // Tear down: borramos el préstamo si quedó vivo y los miembros que creamos
        if (createdLoanId) {
            await prisma.equipmentLoan.deleteMany({
                where: { id: createdLoanId },
            });
        }
        await prisma.member.deleteMany({
            where: { id: { in: [plenoMemberId, cadeteMemberId] } },
        });

        await prisma.$disconnect();
        await app.close();
    });

    it('1. GET: Debe retornar la lista de préstamos existente', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/api/v1/equipment-loans',
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(Array.isArray(body.data)).toBe(true);
    });

    it('2. POST: Debe crear un préstamo en la base de datos real con estado Loaned por defecto', async () => {
        const payload = {
            item_name: `Raqueta E2E ${randomSuffix}`,
            loan_date: '2026-05-01',
            due_date: '2026-05-15',
            member_id: plenoMemberId,
        };

        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/equipment-loans',
            payload,
        });

        expect(response.statusCode).toBe(201);
        const body = JSON.parse(response.payload);

        expect(body.data.id).toBeDefined();
        expect(body.data.item_name).toBe(payload.item_name);
        expect(body.data.status).toBe('Loaned');

        // Guardamos el ID para los siguientes tests y para poder limpiar la DB luego
        createdLoanId = body.data.id;

        // Verificación directa E2E: ¿Se guardó realmente en PostgreSQL?
        const dbLoan = await prisma.equipmentLoan.findUnique({ where: { id: createdLoanId } });
        expect(dbLoan).not.toBeNull();
        expect(dbLoan?.item_name).toBe(payload.item_name);
        expect(dbLoan?.status).toBe('Loaned');
        expect(dbLoan?.member_id).toBe(plenoMemberId);
    });

    it('3. POST: Debe fallar con 404 si el socio no existe en la DB real', async () => {
        const payload = {
            item_name: 'Pelota fantasma',
            loan_date: '2026-05-01',
            due_date: '2026-05-15',
            member_id: '00000000-0000-0000-0000-000000000000',
        };

        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/equipment-loans',
            payload,
        });

        expect(response.statusCode).toBe(404);
        const body = JSON.parse(response.payload);
        expect(body.error).toBe('El socio no existe');
    });

    it('4. POST: Debe fallar con 400 si el socio es Cadete (categoría no permitida)', async () => {
        const payload = {
            item_name: 'Pelota cadete',
            loan_date: '2026-05-01',
            due_date: '2026-05-15',
            member_id: cadeteMemberId,
        };

        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/equipment-loans',
            payload,
        });

        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.payload);
        expect(body.error).toBe('La categoría del socio no le permite tomar prestamos');
    });

    it('5. POST: Debe fallar con 400 si due_date no es mayor a loan_date', async () => {
        const payload = {
            item_name: 'Pelota fecha',
            loan_date: '2026-05-15',
            due_date: '2026-05-01',
            member_id: plenoMemberId,
        };

        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/equipment-loans',
            payload,
        });

        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.payload);
        expect(body.error).toBe('La fecha de devolución esperada debe ser mayor a la fecha del préstamo');
    });

    it('6. PUT: Debe actualizar el préstamo modificando la base de datos', async () => {
        const updatePayload = {
            status: 'Returned',
        };

        const response = await app.inject({
            method: 'PUT',
            url: `/api/v1/equipment-loans/${createdLoanId}`,
            payload: updatePayload,
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body.data.status).toBe('Returned');

        // Verificar directamente en PostgreSQL que el campo se modificó
        const dbLoan = await prisma.equipmentLoan.findUnique({ where: { id: createdLoanId } });
        expect(dbLoan?.status).toBe('Returned');
    });

    it('7. PUT: Debe fallar con 404 al actualizar un préstamo inexistente', async () => {
        const response = await app.inject({
            method: 'PUT',
            url: '/api/v1/equipment-loans/00000000-0000-0000-0000-000000000000',
            payload: { status: 'Returned' },
        });

        expect(response.statusCode).toBe(404);
        const body = JSON.parse(response.payload);
        expect(body.error).toBe('El préstamo no existe');
    });

    it('8. DELETE: Debe eliminar físicamente al préstamo de la base de datos', async () => {
        const response = await app.inject({
            method: 'DELETE',
            url: `/api/v1/equipment-loans/${createdLoanId}`,
        });

        expect(response.statusCode).toBe(204);

        // Verificar que Prisma ya no lo encuentra en la DB real
        const dbLoan = await prisma.equipmentLoan.findUnique({ where: { id: createdLoanId } });
        expect(dbLoan).toBeNull();

        // Anular variable para que afterAll no intente borrarlo nuevamente
        createdLoanId = '';
    });

    it('9. DELETE: Debe fallar con 404 al eliminar un préstamo inexistente', async () => {
        const response = await app.inject({
            method: 'DELETE',
            url: '/api/v1/equipment-loans/00000000-0000-0000-0000-000000000000',
        });

        expect(response.statusCode).toBe(404);
        const body = JSON.parse(response.payload);
        expect(body.error).toBe('El préstamo de equipamiento no existe');
    });
});
