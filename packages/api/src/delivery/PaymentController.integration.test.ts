import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { CreatePaymentRequest, UpdatePaymentRequest } from '@alentapp/shared';

vi.mock('../infrastructure/PostgresPaymentRepository.js', () => {
    return {
        PostgresPaymentRepository: class {
            async findAll() {
                return [
                    {
                        id: '1',
                        month: 5,
                        year: 2026,
                        amount: 1000,
                        due_date: '2026-05-31',
                        payment_date: '2026-05-01',
                        member_id: 'uuid-pleno',
                        status: 'Paid',
                    },
                    {
                        id: '2',
                        month: 2,
                        year: 2026,
                        amount: 1500,
                        due_date: '2026-02-28',
                        payment_date: '2026-05-01',
                        member_id: 'uuid-honorario',
                        status: 'Canceled',
                    },
                ];
            }
            async findById(id: string) {
                if (id === '1') {
                    return {
                        id: '1',
                        month: 5,
                        year: 2026,
                        amount: 1000,
                        due_date: '2026-05-31',
                        payment_date: '2026-05-01',
                        member_id: 'uuid-pleno',
                        status: 'Paid',
                    };
                }
                if (id === '2') {
                    return {
                        id: '2',
                        month: 2,
                        year: 2026,
                        amount: 1500,
                        due_date: '2026-02-28',
                        payment_date: '2026-05-01',
                        member_id: 'uuid-honorario',
                        status: 'Canceled',
                    };
                }
                return null;
            }
            async create(data: CreatePaymentRequest) {
                return { id: '3', ...data };
            }
            async update(id: string, data: UpdatePaymentRequest) {
                return {
                    id,
                    month: 7,
                    year: 2026,
                    amount: 1200,
                    payment_date: '2026-06-01',
                    due_date: '2026-07-31',
                    member_id: 'uuid-honorario',
                    status: 'Paid',
                };
            }
            async cancel(id: string) {
                return {
                    id,
                    month: 5,
                    year: 2026,
                    amount: 1000,
                    due_date: '2026-05-31',
                    payment_date: '2026-05-01',
                    member_id: 'uuid-pleno',
                    status: 'Canceled',
                };
            }
        },
    };
});

vi.mock('../infrastructure/PostgresMemberRepository.js', () => {
    return {
        PostgresMemberRepository: class {
            async findAll() { return []; }
            async findById(id: string) {
                if (id === 'uuid-pleno') return { id: 'uuid-pleno' };
                if (id === 'uuid-honorario') return { id: 'uuid-honorario' };
                if (id === 'uuid-cadete') return { id: 'uuid-cadete' };
                return null;
            }
            async create(data: CreatePaymentRequest) { return { id: 'm-new', ...data }; }
            async update(id: string, data: UpdatePaymentRequest) { return { id, ...data }; }
            async cancel(_id: string) { return; }
        },
    };
});

describe('Payment API Integration Tests', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
        const { buildApp } = await import('../app.js');
        app = buildApp();
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('GET /api/v1/payments', () => {
        it('debe retornar código 200 y el listado de pagos', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/payments',
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.data).toBeInstanceOf(Array);
            expect(body.data[0].id).toBe('1');
        });
    });

    describe('POST /api/v1/payments', () => {
        it('debe retornar 201 y crear el pago con estado Paid por defecto', async () => {
            const payload: CreatePaymentRequest = {
                amount: 1000,
                month: 5,
                year: 2026,
                status: 'Paid',
                due_date: '2027-05-31',
                payment_date: '2027-05-01',
                member_id: 'uuid-pleno',
            };

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/payments',
                payload,
            });

            expect(response.statusCode).toBe(201);
            const body = JSON.parse(response.payload);
            expect(body.data.id).toBeDefined();
            expect(body.data.status).toBe('Paid');
        });

        it('debe atravesar la capa de validación y retornar 404 si el socio no existe', async () => {
            const payload: CreatePaymentRequest = {
                amount: 1000,
                month: 5,
                year: 2026,
                status: 'Paid',
                due_date: '2027-05-31',
                payment_date: '2027-05-01',
                member_id: 'uuid-inexistente',
            };

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/payments',
                payload,
            });

            expect(response.statusCode).toBe(404);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('No existe un miembro con ese ID');
        });

        it('debe retornar 400 si el monto es menor o igual a cero', async () => {
            const payload: CreatePaymentRequest = {
                amount: 0,
                month: 5,
                year: 2026,
                status: 'Paid',
                due_date: '2027-05-31',
                payment_date: '2027-05-01',
                member_id: 'uuid-pleno',
            };

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/payments',
                payload,
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('El monto debe ser mayor a cero');
        });

        it('debe retornar 400 si el mes es inválido', async () => {
            const payload: CreatePaymentRequest = {
                amount: 1000,
                month: 13,
                year: 2026,
                status: 'Paid',
                due_date: '2027-05-31',
                payment_date: '2027-05-01',
                member_id: 'uuid-pleno',
            };

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/payments',
                payload,
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('El mes debe estar entre 1 y 12');
        });

        it('debe retornar 400 si el año es anterior al año actual', async () => {
            const payload: CreatePaymentRequest = {
                amount: 1000,
                month: 5,
                year: 2020,
                status: 'Paid',
                due_date: '2027-05-31',
                payment_date: '2027-05-01',
                member_id: 'uuid-pleno',
            };

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/payments',
                payload,
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('El año debe ser mayor o igual al año actual');
        });

        it('debe retornar 400 si la fecha de vencimiento es anterior a la fecha actual', async () => {
            const payload: CreatePaymentRequest = {
                amount: 1000,
                month: 5,
                year: 2026,
                status: 'Paid',
                due_date: '2020-05-31',
                payment_date: '2027-05-01',
                member_id: 'uuid-pleno',
            };

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/payments',
                payload,
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('La fecha de vencimiento debe ser mayor o igual a la fecha actual');
        });
    });

    describe('PUT /api/v1/payments/:id', () => {
        it('debe retornar 200 y los datos actualizados', async () => {
            const payload: UpdatePaymentRequest = { status: 'Paid', payment_date: '2027-06-01' };

            const response = await app.inject({
                method: 'PUT',
                url: '/api/v1/payments/1',
                payload,
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.data.id).toBe('1');
            expect(body.data.status).toBe('Paid');
        });

        it('debe retornar 404 si el pago no existe', async () => {
            const payload: UpdatePaymentRequest = { status: 'Paid' };

            const response = await app.inject({
                method: 'PUT',
                url: '/api/v1/payments/999',
                payload,
            });

            expect(response.statusCode).toBe(404);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('El pago No existe');
        });

        it('debe retornar 400 si el estado enviado no es válido', async () => {
            const response = await app.inject({
                method: 'PUT',
                url: '/api/v1/payments/1',
                payload: { status: 'Unpaid' as any, payment_date: '' },
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('El estado debe ser "Pendiente" o "Pagado"');
        });

        it('debe retornar 404 si se actualiza con un socio inexistente', async () => {
            const payload: UpdatePaymentRequest = { member_id: 'uuid-inexistente' };

            const response = await app.inject({
                method: 'PUT',
                url: '/api/v1/payments/1',
                payload,
            });

            expect(response.statusCode).toBe(404);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('El miembro No existe');
        });
    });

    describe('PATCH /api/v1/payments/:id (cancelar pago)', () => {
        it('debe retornar 204 si se cancela correctamente', async () => {
            const response = await app.inject({
                method: 'PATCH',
                url: '/api/v1/payments/1',
            });

            expect(response.statusCode).toBe(204);
            expect(response.payload).toBe('');
        });

        it('debe retornar 404 si el pago a cancelar no existe', async () => {
            const response = await app.inject({
                method: 'PATCH',
                url: '/api/v1/payments/999',
            });

            expect(response.statusCode).toBe(404);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('El pago No existe');
        });

        it('debe retornar 409 si el pago ya se encuentra cancelado', async () => {
            const response = await app.inject({
                method: 'PATCH',
                url: '/api/v1/payments/2',
            });

            expect(response.statusCode).toBe(409);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('El pago ya se encuentra cancelado');
        });
    });
});