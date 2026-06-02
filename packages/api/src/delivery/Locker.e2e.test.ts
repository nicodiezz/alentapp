import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client/client.js';

describe('Locker API End-to-End Tests', () => {
    let app: FastifyInstance;
    let prisma: PrismaClient;
    let testMemberId: string;

    const randomSuffix = Math.floor(Math.random() * 100000).toString();
    const testDni = `E2ELOCK${randomSuffix}`;
    const testEmail = `e2elocker${randomSuffix}@test.com`;

    function randomLockerNumber() {
        return 90000 + Math.floor(Math.random() * 9999);
    }

    async function createTestLocker(number: number, location = 'Vestuario E2E'): Promise<string> {
        const locker = await prisma.locker.create({ data: { number, location } });
        return locker.id;
    }

    beforeAll(async () => {
        app = buildApp();
        await app.ready();

        prisma = new PrismaClient({
            adapter: new PrismaPg(process.env.DATABASE_URL as any),
        });
        await prisma.$connect();

        const member = await prisma.member.create({
            data: {
                name: 'Socio E2E Locker',
                dni: testDni,
                email: testEmail,
                birthdate: new Date('2000-01-01'),
                category: 'Pleno',
            },
        });
        testMemberId = member.id;
    });

    afterAll(async () => {
        if (testMemberId) {
            await prisma.member.deleteMany({ where: { id: testMemberId } });
        }
        await prisma.$disconnect();
        await app.close();
    });

    it('1. GET: Debe retornar codigo 200 y la lista de casilleros', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/api/v1/lockers',
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(Array.isArray(body.data)).toBe(true);
    });

    it('2. POST: Debe crear un casillero en la base de datos real', async () => {
        const lockerNumber = randomLockerNumber();
        const payload = { number: lockerNumber, location: 'Vestuario E2E' };

        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/lockers',
            payload,
        });

        expect(response.statusCode).toBe(201);
        const body = JSON.parse(response.payload);

        expect(body.data.id).toBeDefined();
        expect(body.data.number).toBe(lockerNumber);
        expect(body.data.location).toBe('Vestuario E2E');
        expect(body.data.status).toBe('Available');

        const dbLocker = await prisma.locker.findUnique({ where: { id: body.data.id } });
        expect(dbLocker).not.toBeNull();
        expect(dbLocker?.number).toBe(lockerNumber);
        expect(dbLocker?.location).toBe('Vestuario E2E');

        await prisma.locker.delete({ where: { id: body.data.id } });
    });

    it('3. POST: Debe fallar con 409 si el número ya existe', async () => {
        const lockerNumber = randomLockerNumber();
        const lockerId = await createTestLocker(lockerNumber);

        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/lockers',
            payload: { number: lockerNumber, location: 'Otra ubicación' },
        });

        expect(response.statusCode).toBe(409);
        const body = JSON.parse(response.payload);
        expect(body.error).toBe('Ya existe un casillero con ese número');

        await prisma.locker.delete({ where: { id: lockerId } });
    });

    it('4. POST: Debe fallar con 400 si la ubicación está vacía', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/lockers',
            payload: { number: randomLockerNumber(), location: '' },
        });

        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.payload);
        expect(body.error).toBe('La ubicación es requerida');
    });

    it('5. PUT: Debe actualizar la ubicación del casillero', async () => {
        const lockerId = await createTestLocker(randomLockerNumber());

        const response = await app.inject({
            method: 'PUT',
            url: `/api/v1/lockers/${lockerId}`,
            payload: { location: 'Vestuario E2E Actualizado' },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body.data.location).toBe('Vestuario E2E Actualizado');

        const dbLocker = await prisma.locker.findUnique({ where: { id: lockerId } });
        expect(dbLocker?.location).toBe('Vestuario E2E Actualizado');

        await prisma.locker.delete({ where: { id: lockerId } });
    });

    it('6. PUT: Debe asignar un miembro real al casillero', async () => {
        const lockerId = await createTestLocker(randomLockerNumber());

        const response = await app.inject({
            method: 'PUT',
            url: `/api/v1/lockers/${lockerId}`,
            payload: { member_id: testMemberId, status: 'Occupied' },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body.data.member_id).toBe(testMemberId);
        expect(body.data.status).toBe('Occupied');

        const dbLocker = await prisma.locker.findUnique({ where: { id: lockerId } });
        expect(dbLocker?.member_id).toBe(testMemberId);

        await prisma.locker.delete({ where: { id: lockerId } });
    });

    it('7. PUT: Debe fallar con 409 al asignar miembro a casillero en mantenimiento', async () => {
        const lockerId = await createTestLocker(randomLockerNumber());

        // Poner en mantenimiento via API
        await app.inject({
            method: 'PUT',
            url: `/api/v1/lockers/${lockerId}`,
            payload: { member_id: null, status: 'Maintenance' },
        });

        const response = await app.inject({
            method: 'PUT',
            url: `/api/v1/lockers/${lockerId}`,
            payload: { member_id: testMemberId },
        });

        expect(response.statusCode).toBe(409);
        const body = JSON.parse(response.payload);
        expect(body.error).toBe('No se puede asignar un casillero en mantenimiento');

        await prisma.locker.delete({ where: { id: lockerId } });
    });

    it('8. PUT: Debe fallar con 404 si el casillero no existe', async () => {
        const response = await app.inject({
            method: 'PUT',
            url: '/api/v1/lockers/00000000-0000-0000-0000-000000000000',
            payload: { location: 'No importa' },
        });

        expect(response.statusCode).toBe(404);
        const body = JSON.parse(response.payload);
        expect(body.error).toBe('El casillero no existe');
    });

    it('9. DELETE: Debe eliminar el casillero existente', async () => {
        const lockerId = await createTestLocker(randomLockerNumber());

        const response = await app.inject({
            method: 'DELETE',
            url: `/api/v1/lockers/${lockerId}`,
        });

        expect(response.statusCode).toBe(204);

        const dbLocker = await prisma.locker.findUnique({ where: { id: lockerId } });
        expect(dbLocker).toBeNull();
    });

    it('10. DELETE: Debe fallar con 404 si el casillero no existe', async () => {
        const response = await app.inject({
            method: 'DELETE',
            url: '/api/v1/lockers/00000000-0000-0000-0000-000000000000',
        });

        expect(response.statusCode).toBe(404);
        const body = JSON.parse(response.payload);
        expect(body.error).toBe('El Locker no existe');
    });
});
