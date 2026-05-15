import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { CreateDisciplineRequest } from '@alentapp/shared';

vi.mock('../infrastructure/PostgresMemberRepository.js', () => {
    return {
        PostgresMemberRepository: class {
            async findById(id: string) {
                return id === '1'
                    ? { id: '1', name: 'Socio Existente', birthdate: '1990-01-01' }
                    : null;
            }
        }
    };
});

vi.mock('../infrastructure/PostgresDisciplineRepository.js', () => {
    const existingDiscipline = {
        id: '1',
        reason: 'Suspension Existente',
        issue_date: '2026-04-01',
        expiry_date: '2026-06-01',
        is_total_suspension: false,
        member_id: '1',
    };

    return {
        PostgresDisciplineRepository: class {
            async findAll() { return [existingDiscipline]; }
            async findById(id: string) { return id === existingDiscipline.id ? existingDiscipline : null; }
            async create(data: any) { return { id: '2', ...data }; }
        }
    };
});

describe('Discipline API Integration Tests', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
        app = buildApp();
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('GET /api/v1/disciplines', () => {
        it('debe retornar codigo 200 y el listado de suspensiones', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/disciplines',
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.data).toBeInstanceOf(Array);
            expect(body.data[0].id).toBe('1');
            expect(body.data[0].reason).toBe('Suspension Existente');
        });
    });

    describe('POST /api/v1/disciplines', () => {
        it('debe retornar 201 y crear la suspension', async () => {
            const payload: CreateDisciplineRequest = {
                reason: 'Nueva integracion',
                issue_date: '2026-05-01',
                expiry_date: '2026-05-10',
                is_total_suspension: false,
                member_id: '1',
            };

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/disciplines',
                payload,
            });

            expect(response.statusCode).toBe(201);
            const body = JSON.parse(response.payload);
            expect(body.data.id).toBe('2');
            expect(body.data.reason).toBe('Nueva integracion');
            expect(body.data.member_id).toBe('1');
        });

        it('debe retornar 404 si el miembro indicado no existe', async () => {
            const payload: CreateDisciplineRequest = {
                reason: 'Miembro inexistente',
                issue_date: '2026-05-01',
                expiry_date: '2026-05-10',
                is_total_suspension: false,
                member_id: '999',
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

        it('debe retornar 400 si la fecha de fin de suspensión es previa a la fecha de inicio', async () => {
            const payload: CreateDisciplineRequest = {
                reason: 'Fechas invalidas',
                issue_date: '2026-05-10',
                expiry_date: '2026-05-01',
                is_total_suspension: false,
                member_id: '1',
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

        it('debe retornar 400 si el formato de fecha es inválido', async () => {
            const payload: CreateDisciplineRequest = {
                reason: 'Fechas invalidas',
                issue_date: '2026-5-10',
                expiry_date: '2026-05-01',
                is_total_suspension: false,
                member_id: '1',
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
});
