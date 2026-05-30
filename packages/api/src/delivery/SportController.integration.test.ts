import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { CreateSportRequest, SportDTO, UpdateSportRequest } from '@alentapp/shared';

const mockSports = vi.hoisted<SportDTO[]>(() => [
    {
        id: '1',
        name: 'Natación',
        description: 'Clases en pileta cubierta',
        max_capacity: 20,
        additional_price: 1500,
        requires_medical_certificate: true,
    },
    {
        id: '2',
        name: 'Tenis',
        description: 'Entrenamiento en cancha',
        max_capacity: 12,
        additional_price: 2000,
        requires_medical_certificate: false,
    },
]);

const mockSportRepository = vi.hoisted(() => ({
    findAll: vi.fn<() => Promise<SportDTO[]>>(),
    findById: vi.fn<(id: string) => Promise<SportDTO | null>>(),
    findByName: vi.fn<(name: string) => Promise<SportDTO | null>>(),
    create: vi.fn<(data: CreateSportRequest) => Promise<SportDTO>>(),
    update: vi.fn<(id: string, data: UpdateSportRequest) => Promise<SportDTO>>(),
    delete: vi.fn<(id: string) => Promise<void>>(),
}));

// Mockeamos los repositorios para que la API completa funcione sin conectarse a la Base de Datos real.
// En Sport dejamos comportamiento suficiente para testear Fastify -> Controller -> UseCase -> Validator.
vi.mock('../infrastructure/PostgresSportRepository.js', () => {
    return {
        PostgresSportRepository: class {
            async findAll() {
                return mockSportRepository.findAll();
            }

            async findById(id: string) {
                return mockSportRepository.findById(id);
            }

            async findByName(name: string) {
                return mockSportRepository.findByName(name);
            }

            async create(data: CreateSportRequest) {
                return mockSportRepository.create(data);
            }

            async update(id: string, data: UpdateSportRequest) {
                return mockSportRepository.update(id, data);
            }

            async delete(id: string) {
                return mockSportRepository.delete(id);
            }
        },
    };
});

vi.mock('../infrastructure/PostgresMemberRepository.js', () => ({
    PostgresMemberRepository: class { },
}));

vi.mock('../infrastructure/PostgresPaymentRepository.js', () => ({
    PostgresPaymentRepository: class { },
}));

vi.mock('../infrastructure/PostgresDisciplineRepository.js', () => ({
    PostgresDisciplineRepository: class { },
}));

vi.mock('../infrastructure/PostgresEquipmentLoanRepository.js', () => ({
    PostgresEquipmentLoanRepository: class { },
}));

vi.mock('../infrastructure/PostgresMedicalCertificateRepository.js', () => ({
    PostgresMedicalCertificateRepository: class { },
}));

vi.mock('../infrastructure/PostgresLockerRepository.js', () => ({
    PostgresLockerRepository: class { },
}));

describe('Sport API Integration Tests', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
        app = buildApp();
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    beforeEach(() => {
        mockSportRepository.findAll.mockReset();
        mockSportRepository.findById.mockReset();
        mockSportRepository.findByName.mockReset();
        mockSportRepository.create.mockReset();
        mockSportRepository.update.mockReset();
        mockSportRepository.delete.mockReset();

        mockSportRepository.findAll.mockResolvedValue(mockSports);
        mockSportRepository.findById.mockImplementation(async (id) =>
            mockSports.find((sport) => sport.id === id) ?? null
        );
        mockSportRepository.findByName.mockImplementation(async (name) =>
            mockSports.find((sport) => sport.name === name) ?? null
        );
        mockSportRepository.create.mockImplementation(async (data) => ({ id: '3', ...data }));
        mockSportRepository.update.mockImplementation(async (id, data) => {
            const sport = mockSports.find((item) => item.id === id);
            if (!sport) {
                throw new Error('El deporte no existe');
            }

            return { ...sport, ...data };
        });
        mockSportRepository.delete.mockResolvedValue(undefined);
    });

    describe('GET /api/v1/sports', () => {
        it('debe retornar código 200 y el listado de deportes', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/sports',
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.data).toBeInstanceOf(Array);
            expect(body.data[0].id).toBe('1');
            expect(body.data[0].name).toBe('Natación');
        });
    });

    describe('POST /api/v1/sports', () => {
        it('debe retornar 201 y crear el deporte', async () => {
            const payload: CreateSportRequest = {
                name: 'Voley',
                description: 'Entrenamiento mixto',
                max_capacity: 18,
                additional_price: 1200,
                requires_medical_certificate: true,
            };

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/sports',
                payload,
            });

            expect(response.statusCode).toBe(201);
            const body = JSON.parse(response.payload);
            expect(body.data.id).toBeDefined();
            expect(body.data.name).toBe('Voley');
            expect(body.data.max_capacity).toBe(18);
        });

        it('debe atravesar la capa de validación y retornar 409 si el nombre existe', async () => {
            const payload: CreateSportRequest = {
                name: 'Natación',
                description: 'Otro curso de natación',
                max_capacity: 10,
                additional_price: 1000,
                requires_medical_certificate: true,
            };

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/sports',
                payload,
            });

            expect(response.statusCode).toBe(409);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('Ya existe un deporte con ese nombre');
        });

        it('debe retornar 400 si falta un campo requerido', async () => {
            const payload = {
                name: '',
                description: 'Sin nombre',
                max_capacity: 10,
                additional_price: 1000,
                requires_medical_certificate: true,
            };

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/sports',
                payload,
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('El nombre es requerido');
        });

        it('debe retornar 400 si la capacidad máxima no es válida', async () => {
            const payload: CreateSportRequest = {
                name: 'Básquet',
                description: 'Entrenamiento recreativo',
                max_capacity: 0,
                additional_price: 1400,
                requires_medical_certificate: true,
            };

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/sports',
                payload,
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('La capacidad máxima debe ser mayor a cero');
        });

        it('debe retornar 500 si ocurre un error de conexión a DB al crear', async () => {
            mockSportRepository.create.mockRejectedValueOnce(new Error('Error de conexión a DB'));

            const payload: CreateSportRequest = {
                name: 'Handball',
                description: 'Entrenamiento competitivo',
                max_capacity: 16,
                additional_price: 1300,
                requires_medical_certificate: true,
            };

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/sports',
                payload,
            });

            expect(response.statusCode).toBe(500);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('Error interno, reintente más tarde');
        });
    });

    describe('PUT /api/v1/sports/:id', () => {
        it('debe retornar 200 y actualizar descripción y capacidad máxima', async () => {
            const response = await app.inject({
                method: 'PUT',
                url: '/api/v1/sports/1',
                payload: {
                    description: 'Clases para nivel inicial',
                    max_capacity: 25,
                },
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.data.id).toBe('1');
            expect(body.data.description).toBe('Clases para nivel inicial');
            expect(body.data.max_capacity).toBe(25);
        });

        it('debe retornar 400 si se intenta modificar el nombre', async () => {
            const response = await app.inject({
                method: 'PUT',
                url: '/api/v1/sports/1',
                payload: {
                    name: 'Nombre nuevo',
                },
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('El nombre del deporte no puede modificarse');
        });

        it('debe retornar 400 si la capacidad máxima no es válida al actualizar', async () => {
            const response = await app.inject({
                method: 'PUT',
                url: '/api/v1/sports/1',
                payload: {
                    max_capacity: 0,
                },
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('La capacidad máxima debe ser mayor a cero');
        });

        it('debe retornar 404 si el deporte a actualizar no existe', async () => {
            const response = await app.inject({
                method: 'PUT',
                url: '/api/v1/sports/999',
                payload: {
                    description: 'No existe',
                },
            });

            expect(response.statusCode).toBe(404);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('El deporte no existe');
        });

        it('debe retornar 500 si ocurre un error de conexión a DB al actualizar', async () => {
            mockSportRepository.update.mockRejectedValueOnce(new Error('Error de conexión a DB'));

            const response = await app.inject({
                method: 'PUT',
                url: '/api/v1/sports/1',
                payload: {
                    description: 'Descripción válida',
                    max_capacity: 22,
                },
            });

            expect(response.statusCode).toBe(500);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('Error interno, reintente más tarde');
        });
    });

    describe('DELETE /api/v1/sports/:id', () => {
        it('debe retornar 204 si se elimina correctamente', async () => {
            const response = await app.inject({
                method: 'DELETE',
                url: '/api/v1/sports/1',
            });

            expect(response.statusCode).toBe(204);
            expect(response.payload).toBe('');
        });

        it('debe retornar 404 si el deporte a eliminar no existe', async () => {
            const response = await app.inject({
                method: 'DELETE',
                url: '/api/v1/sports/999',
            });

            expect(response.statusCode).toBe(404);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('El deporte no existe');
        });

        it('debe retornar 500 si ocurre un error de conexión a DB al eliminar', async () => {
            mockSportRepository.delete.mockRejectedValueOnce(new Error('Error de conexión a DB'));

            const response = await app.inject({
                method: 'DELETE',
                url: '/api/v1/sports/1',
            });

            expect(response.statusCode).toBe(500);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('Error interno, reintente más tarde');
        });
    });
});
