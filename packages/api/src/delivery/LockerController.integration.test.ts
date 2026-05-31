import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { CreateLockerRequest, LockerDTO, MemberDTO, UpdateLockerRequest } from '@alentapp/shared';

const mockLockers = vi.hoisted<LockerDTO[]>(() => [
    {
        id: '1',
        number: 10,
        location: 'Vestuario A',
        status: 'Available',
        member_id: null,
    },
    {
        id: '2',
        number: 20,
        location: 'Vestuario B',
        status: 'Occupied',
        member_id: 'member-1',
    },
]);

const mockLockerRepository = vi.hoisted(() => ({
    findAll: vi.fn<() => Promise<LockerDTO[]>>(),
    findById: vi.fn<(id: string) => Promise<LockerDTO | null>>(),
    findByNumber: vi.fn<(number: number) => Promise<LockerDTO | null>>(),
    create: vi.fn<(data: CreateLockerRequest) => Promise<LockerDTO>>(),
    update: vi.fn<(id: string, data: UpdateLockerRequest) => Promise<LockerDTO>>(),
    delete: vi.fn<(id: string) => Promise<void>>(),
}));

const mockMember = vi.hoisted<MemberDTO>(() => ({
    id: 'member-1',
    name: 'Socio Test',
    dni: '12345678',
    email: 'socio@test.com',
    birthdate: '1990-01-01',
    category: 'Pleno',
    status: 'Activo',
    created_at: new Date().toISOString(),
}));

const mockMemberRepository = vi.hoisted(() => ({
    findById: vi.fn<(id: string) => Promise<MemberDTO | null>>(),
    findAll: vi.fn<() => Promise<MemberDTO[]>>(),
    findByDni: vi.fn<(dni: string) => Promise<MemberDTO | null>>(),
    findByEmail: vi.fn<(email: string) => Promise<MemberDTO | null>>(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
}));

vi.mock('../infrastructure/PostgresLockerRepository.js', () => {
    return {
        PostgresLockerRepository: class {
            async findAll() { return mockLockerRepository.findAll(); }
            async findById(id: string) { return mockLockerRepository.findById(id); }
            async findByNumber(number: number) { return mockLockerRepository.findByNumber(number); }
            async create(data: CreateLockerRequest) { return mockLockerRepository.create(data); }
            async update(id: string, data: UpdateLockerRequest) { return mockLockerRepository.update(id, data); }
            async delete(id: string) { return mockLockerRepository.delete(id); }
        },
    };
});

vi.mock('../infrastructure/PostgresMemberRepository.js', () => {
    return {
        PostgresMemberRepository: class {
            async findById(id: string) { return mockMemberRepository.findById(id); }
            async findAll() { return mockMemberRepository.findAll(); }
            async findByDni(dni: string) { return mockMemberRepository.findByDni(dni); }
            async findByEmail(email: string) { return mockMemberRepository.findByEmail(email); }
            async create(data: any) { return mockMemberRepository.create(data); }
            async update(id: string, data: any) { return mockMemberRepository.update(id, data); }
            async delete(id: string) { return mockMemberRepository.delete(id); }
        },
    };
});

vi.mock('../infrastructure/PostgresSportRepository.js', () => ({
    PostgresSportRepository: class { },
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

describe('Locker API Integration Tests', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
        app = buildApp();
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    beforeEach(() => {
        mockLockerRepository.findAll.mockReset();
        mockLockerRepository.findById.mockReset();
        mockLockerRepository.findByNumber.mockReset();
        mockLockerRepository.create.mockReset();
        mockLockerRepository.update.mockReset();
        mockLockerRepository.delete.mockReset();
        mockMemberRepository.findById.mockReset();

        mockLockerRepository.findAll.mockResolvedValue(mockLockers);
        mockLockerRepository.findById.mockImplementation(async (id) =>
            mockLockers.find((l) => l.id === id) ?? null
        );
        mockLockerRepository.findByNumber.mockImplementation(async (number) =>
            mockLockers.find((l) => l.number === number) ?? null
        );
        mockLockerRepository.create.mockImplementation(async (data) => ({
            id: '3',
            status: 'Available' as const,
            member_id: null,
            ...data,
        }));
        mockLockerRepository.update.mockImplementation(async (id, data) => {
            const locker = mockLockers.find((l) => l.id === id);
            if (!locker) throw new Error('El casillero no existe');
            return { ...locker, ...data };
        });
        mockLockerRepository.delete.mockResolvedValue(undefined);
        mockMemberRepository.findById.mockImplementation(async (id) =>
            id === mockMember.id ? mockMember : null
        );
    });

    describe('GET /api/v1/lockers', () => {
        it('debe retornar código 200 y el listado de casilleros', async () => {
            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/lockers',
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.data).toBeInstanceOf(Array);
            expect(body.data[0].id).toBe('1');
            expect(body.data[0].number).toBe(10);
            expect(body.data[0].location).toBe('Vestuario A');
        });
    });

    describe('POST /api/v1/lockers', () => {
        it('debe retornar 201 y crear el casillero', async () => {
            const payload: CreateLockerRequest = {
                number: 30,
                location: 'Vestuario C',
            };

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/lockers',
                payload,
            });

            expect(response.statusCode).toBe(201);
            const body = JSON.parse(response.payload);
            expect(body.data.id).toBeDefined();
            expect(body.data.number).toBe(30);
            expect(body.data.location).toBe('Vestuario C');
            expect(body.data.status).toBe('Available');
        });

        it('debe atravesar la capa de validación y retornar 409 si el número ya existe', async () => {
            const payload: CreateLockerRequest = {
                number: 10,
                location: 'Otro Vestuario',
            };

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/lockers',
                payload,
            });

            expect(response.statusCode).toBe(409);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('Ya existe un casillero con ese número');
        });

        it('debe retornar 400 si la ubicación está vacía', async () => {
            const payload = {
                number: 50,
                location: '',
            };

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/lockers',
                payload,
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('La ubicación es requerida');
        });

        it('debe retornar 500 si ocurre un error de conexión a DB al crear', async () => {
            mockLockerRepository.findByNumber.mockResolvedValueOnce(null);
            mockLockerRepository.create.mockRejectedValueOnce(new Error('Error de conexión a DB'));

            const payload: CreateLockerRequest = {
                number: 99,
                location: 'Vestuario Z',
            };

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/lockers',
                payload,
            });

            expect(response.statusCode).toBe(500);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('Error interno, reintente mas tarde');
        });
    });

    describe('PUT /api/v1/lockers/:id', () => {
        it('debe retornar 200 y actualizar la ubicación', async () => {
            const response = await app.inject({
                method: 'PUT',
                url: '/api/v1/lockers/1',
                payload: {
                    location: 'Vestuario Renovado',
                },
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.data.id).toBe('1');
            expect(body.data.location).toBe('Vestuario Renovado');
        });

        it('debe retornar 404 si el casillero a actualizar no existe', async () => {
            const response = await app.inject({
                method: 'PUT',
                url: '/api/v1/lockers/999',
                payload: {
                    location: 'No importa',
                },
            });

            expect(response.statusCode).toBe(404);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('El casillero no existe');
        });

        it('debe retornar 404 si el miembro indicado no existe', async () => {
            mockMemberRepository.findById.mockResolvedValueOnce(null);

            const response = await app.inject({
                method: 'PUT',
                url: '/api/v1/lockers/1',
                payload: {
                    member_id: '00000000-0000-0000-0000-000000000000',
                },
            });

            expect(response.statusCode).toBe(404);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('El miembro indicado no existe');
        });

        it('debe retornar 409 si el número a actualizar ya existe en otro casillero', async () => {
            const response = await app.inject({
                method: 'PUT',
                url: '/api/v1/lockers/1',
                payload: {
                    number: 20,
                },
            });

            expect(response.statusCode).toBe(409);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('Ya existe un casillero con ese número');
        });

        it('debe retornar 409 si se intenta asignar miembro a casillero en mantenimiento', async () => {
            const maintenanceLocker = { ...mockLockers[0], status: 'Maintenance' as const, member_id: null };
            mockLockerRepository.findById.mockResolvedValueOnce(maintenanceLocker);
            mockMemberRepository.findById.mockResolvedValueOnce(mockMember);

            const response = await app.inject({
                method: 'PUT',
                url: '/api/v1/lockers/1',
                payload: {
                    member_id: 'member-1',
                },
            });

            expect(response.statusCode).toBe(409);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('No se puede asignar un casillero en mantenimiento');
        });

        it('debe retornar 400 si la ubicación actualizada está vacía', async () => {
            const response = await app.inject({
                method: 'PUT',
                url: '/api/v1/lockers/1',
                payload: {
                    location: '',
                },
            });

            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('La ubicación es requerida');
        });

        it('debe retornar 500 si ocurre un error de conexión a DB al actualizar', async () => {
            mockLockerRepository.update.mockRejectedValueOnce(new Error('Error de conexión a DB'));

            const response = await app.inject({
                method: 'PUT',
                url: '/api/v1/lockers/1',
                payload: {
                    location: 'Ubicación válida',
                },
            });

            expect(response.statusCode).toBe(500);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('Error interno, reintente mas tarde');
        });
    });

    describe('DELETE /api/v1/lockers/:id', () => {
        it('debe retornar 204 si se elimina correctamente', async () => {
            const response = await app.inject({
                method: 'DELETE',
                url: '/api/v1/lockers/1',
            });

            expect(response.statusCode).toBe(204);
            expect(response.payload).toBe('');
        });

        it('debe retornar 404 si el casillero a eliminar no existe', async () => {
            const response = await app.inject({
                method: 'DELETE',
                url: '/api/v1/lockers/999',
            });

            expect(response.statusCode).toBe(404);
            const body = JSON.parse(response.payload);
            expect(body.error).toBe('El Locker no existe');
        });
    });
});
