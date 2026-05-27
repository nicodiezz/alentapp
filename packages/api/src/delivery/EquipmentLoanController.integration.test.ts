import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { CreateEquipmentLoanRequest, UpdateEquipmentLoanRequest } from '@alentapp/shared';

// Mockeamos el repositorio de equipment loans y el de member (este último porque el validador
// lo usa para verificar que el socio exista y pueda tomar préstamos). De esta forma testeamos
// el ciclo completo: Fastify -> Controller -> UseCase -> Validator sin tocar la base de datos.
vi.mock('../infrastructure/PostgresEquipmentLoanRepository.js', () => {
    return {
        PostgresEquipmentLoanRepository: class {
            async findAll() {
                return [
                    {
                        id: '1',
                        item_name: 'Raqueta',
                        status: 'Loaned',
                        loan_date: '2026-05-01',
                        due_date: '2026-05-15',
                        member_id: 'uuid-pleno',
                    },
                ];
            }
            async findById(id: string) {
                if (id === '1') {
                    return {
                        id: '1',
                        item_name: 'Raqueta',
                        status: 'Loaned',
                        loan_date: '2026-05-01',
                        due_date: '2026-05-15',
                        member_id: 'uuid-pleno',
                    };
                }
                return null;
            }
            async create(data: any) {
                return { id: '2', status: 'Loaned', ...data };
            }
            async update(id: string, data: any) {
                return {
                    id,
                    item_name: 'Raqueta',
                    status: 'Loaned',
                    loan_date: '2026-05-01',
                    due_date: '2026-05-15',
                    member_id: 'uuid-pleno',
                    ...data,
                };
            }
            async delete(_id: string) { return; }
        },
    };
});

vi.mock('../infrastructure/PostgresMemberRepository.js', () => {
    return {
        PostgresMemberRepository: class {
            async findAll() { return []; }
            async findById(id: string) {
                if (id === 'uuid-pleno') return { id: 'uuid-pleno', category: 'Pleno' };
                if (id === 'uuid-honorario') return { id: 'uuid-honorario', category: 'Honorario' };
                if (id === 'uuid-cadete') return { id: 'uuid-cadete', category: 'Cadete' };
                return null;
            }
            async findByDni(_dni: string) { return null; }
            async create(data: any) { return { id: 'm-new', ...data }; }
            async update(id: string, data: any) { return { id, ...data }; }
            async delete(_id: string) { return; }
        },
    };
});

describe('EquipmentLoan API Integration Tests', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
        app = buildApp();
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('GET /api/v1/equipment-loans', () => {
        it('debe retornar código 200 y el listado de préstamos', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/equipment-loans',
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.data).toBeInstanceOf(Array);
            expect(body.data[0].id).toBe('1');
            expect(body.data[0].item_name).toBe('Raqueta');
        });
    });

    describe('POST /api/v1/equipment-loans', () => {
        it('debe retornar 201 y crear el préstamo con estado Loaned por defecto', async () => {
            const payload: CreateEquipmentLoanRequest = {
                item_name: 'Pelota de fútbol',
                loan_date: '2026-05-01',
                due_date: '2026-05-15',
                member_id: 'uuid-pleno',
            };

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/equipment-loans',
                payload,
            });

            expect(response.statusCode).toBe(201);
            const body = JSON.parse(response.payload);
            expect(body.data.item_name).toBe('Pelota de fútbol');
            expect(body.data.status).toBe('Loaned');
            expect(body.data.id).toBeDefined();
        });

        it('debe atravesar la capa de validación y retornar 404 si el socio no existe', async () => {
            const payload: CreateEquipmentLoanRequest = {
                item_name: 'Raqueta',
                loan_date: '2026-05-01',
                due_date: '2026-05-15',
                member_id: 'uuid-inexistente',
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

        it('debe retornar 400 si la categoría del socio no le permite tomar préstamos', async () => {
            const payload: CreateEquipmentLoanRequest = {
                item_name: 'Raqueta',
                loan_date: '2026-05-01',
                due_date: '2026-05-15',
                member_id: 'uuid-cadete',
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

        it('debe retornar 400 si la fecha de devolución es anterior a la fecha del préstamo', async () => {
            const payload: CreateEquipmentLoanRequest = {
                item_name: 'Raqueta',
                loan_date: '2026-05-15',
                due_date: '2026-05-01',
                member_id: 'uuid-pleno',
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

        it('debe retornar 400 si el formato de fecha es inválido', async () => {
            const payload: CreateEquipmentLoanRequest = {
                item_name: 'Raqueta',
                loan_date: 'fecha-invalida',
                due_date: '2026-05-15',
                member_id: 'uuid-pleno',
            };

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/equipment-loans',
                payload,
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('Formato de fecha inválido');
        });
    });

    describe('PUT /api/v1/equipment-loans/:id', () => {
        it('debe retornar 200 y los datos actualizados', async () => {
            const payload: UpdateEquipmentLoanRequest = { status: 'Returned' };

            const response = await app.inject({
                method: 'PUT',
                url: '/api/v1/equipment-loans/1',
                payload,
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.data.id).toBe('1');
            expect(body.data.status).toBe('Returned');
        });

        it('debe retornar 404 si el préstamo no existe', async () => {
            const payload: UpdateEquipmentLoanRequest = { status: 'Returned' };

            const response = await app.inject({
                method: 'PUT',
                url: '/api/v1/equipment-loans/999',
                payload,
            });

            expect(response.statusCode).toBe(404);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('El préstamo no existe');
        });

        it('debe retornar 400 si el estado enviado no es válido', async () => {
            const response = await app.inject({
                method: 'PUT',
                url: '/api/v1/equipment-loans/1',
                payload: { status: 'Perdido' },
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('El estado del préstamo no es válido');
        });

        it('debe retornar 404 si se actualiza con un socio inexistente', async () => {
            const payload: UpdateEquipmentLoanRequest = { member_id: 'uuid-inexistente' };

            const response = await app.inject({
                method: 'PUT',
                url: '/api/v1/equipment-loans/1',
                payload,
            });

            expect(response.statusCode).toBe(404);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('El socio no existe');
        });

        it('debe retornar 400 si la fecha de devolución es anterior a la nueva fecha de préstamo', async () => {
            const payload: UpdateEquipmentLoanRequest = { loan_date: '2026-06-01' };

            const response = await app.inject({
                method: 'PUT',
                url: '/api/v1/equipment-loans/1',
                payload,
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('La fecha de devolución esperada debe ser mayor a la fecha del préstamo');
        });
    });

    describe('DELETE /api/v1/equipment-loans/:id', () => {
        it('debe retornar 204 si se elimina correctamente', async () => {
            const response = await app.inject({
                method: 'DELETE',
                url: '/api/v1/equipment-loans/1',
            });

            expect(response.statusCode).toBe(204);
            expect(response.payload).toBe('');
        });

        it('debe retornar 404 si el préstamo a eliminar no existe', async () => {
            const response = await app.inject({
                method: 'DELETE',
                url: '/api/v1/equipment-loans/999',
            });

            expect(response.statusCode).toBe(404);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('El préstamo de equipamiento no existe');
        });
    });
});
