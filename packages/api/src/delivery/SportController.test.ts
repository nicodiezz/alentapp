import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FastifyReply, FastifyRequest } from 'fastify';
import { CreateSportRequest, SportDTO, UpdateSportRequest } from '@alentapp/shared';
import { DeleteSportUseCase } from '../application/DeleteSportUseCase.js';
import { GetSportsUseCase } from '../application/GetSportsUseCase.js';
import { CreateSportUseCase } from '../application/NewSportUseCase.js';
import { UpdateSportUseCase } from '../application/UpdateSportUseCase.js';
import { SportRepository } from '../domain/SportRepository.js';
import { SportValidator } from '../domain/services/SportValidator.js';
import { SportController } from './SportController.js';

describe('SportController', () => {
    const sportRepo: SportRepository = {
        create: vi.fn(),
        findAll: vi.fn(),
        findById: vi.fn(),
        findByName: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    };

    const sportValidator = new SportValidator(sportRepo);
    const createUseCase = new CreateSportUseCase(sportRepo, sportValidator);
    const getUseCase = new GetSportsUseCase(sportRepo);
    const updateUseCase = new UpdateSportUseCase(sportRepo, sportValidator);
    const deleteUseCase = new DeleteSportUseCase(sportRepo);

    const createExecuteSpy = vi.spyOn(createUseCase, 'execute');
    const getExecuteSpy = vi.spyOn(getUseCase, 'execute');
    const updateExecuteSpy = vi.spyOn(updateUseCase, 'execute');
    const deleteExecuteSpy = vi.spyOn(deleteUseCase, 'execute');

    const controller = new SportController(
        createUseCase,
        getUseCase,
        updateUseCase,
        deleteUseCase,
    );

    const mockReply: Pick<FastifyReply, 'status' | 'send'> = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
    };

    type SportRequest = FastifyRequest<{
        Body: CreateSportRequest & UpdateSportRequest;
        Params: { id: string };
    }>;

    const mockRequest: Partial<SportRequest> = {
        body: {
            name: 'Natación',
            description: 'Clases en pileta cubierta',
            max_capacity: 20,
            additional_price: 1500,
            requires_medical_certificate: true,
        },
        params: { id: 'sport-1' },
    };

    const request = mockRequest as SportRequest;
    const reply = mockReply as FastifyReply;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('create', () => {
        it('debe devolver status 201 y los datos si la creación es exitosa', async () => {
            const mockSport: SportDTO = {
                id: 'sport-1',
                name: 'Natación',
                description: 'Clases en pileta cubierta',
                max_capacity: 20,
                additional_price: 1500,
                requires_medical_certificate: true,
            };
            createExecuteSpy.mockResolvedValueOnce(mockSport);

            await controller.create(request, reply);

            expect(createExecuteSpy).toHaveBeenCalledWith(mockRequest.body);
            expect(mockReply.status).toHaveBeenCalledWith(201);
            expect(mockReply.send).toHaveBeenCalledWith({ data: mockSport });
        });

        it('debe devolver status 409 Conflict si el nombre ya existe', async () => {
            createExecuteSpy.mockRejectedValueOnce(new Error('Ya existe un deporte con ese nombre'));

            await controller.create(request, reply);

            expect(mockReply.status).toHaveBeenCalledWith(409);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'Ya existe un deporte con ese nombre' });
        });

        it('debe devolver status 400 Bad Request si falta un campo requerido', async () => {
            createExecuteSpy.mockRejectedValueOnce(new Error('El nombre es requerido'));

            await controller.create(request, reply);

            expect(mockReply.status).toHaveBeenCalledWith(400);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'El nombre es requerido' });
        });

        it('debe devolver status 400 Bad Request si la capacidad máxima es inválida', async () => {
            createExecuteSpy.mockRejectedValueOnce(new Error('La capacidad máxima debe ser mayor a cero'));

            await controller.create(request, reply);

            expect(mockReply.status).toHaveBeenCalledWith(400);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'La capacidad máxima debe ser mayor a cero' });
        });

        it('debe devolver status 500 para cualquier otro error', async () => {
            createExecuteSpy.mockRejectedValueOnce(new Error('Error de conexión a DB'));

            await controller.create(request, reply);

            expect(mockReply.status).toHaveBeenCalledWith(500);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'Error interno, reintente más tarde' });
        });
    });

    describe('getAll', () => {
        it('debe devolver status 200 y la lista de deportes', async () => {
            const mockSports: SportDTO[] = [
                {
                    id: 'sport-1',
                    name: 'Natación',
                    description: 'Clases en pileta cubierta',
                    max_capacity: 20,
                    additional_price: 1500,
                    requires_medical_certificate: true,
                },
                {
                    id: 'sport-2',
                    name: 'Tenis',
                    description: 'Entrenamiento en cancha',
                    max_capacity: 12,
                    additional_price: 2000,
                    requires_medical_certificate: false,
                },
            ];
            getExecuteSpy.mockResolvedValueOnce(mockSports);

            await controller.getAll(request, reply);

            expect(mockReply.status).toHaveBeenCalledWith(200);
            expect(mockReply.send).toHaveBeenCalledWith({ data: mockSports });
        });

        it('debe devolver status 500 si falla el caso de uso', async () => {
            getExecuteSpy.mockRejectedValueOnce(new Error('DB falló'));

            await controller.getAll(request, reply);

            expect(mockReply.status).toHaveBeenCalledWith(500);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'DB falló' });
        });
    });

    describe('update', () => {
        it('debe devolver status 200 y los datos si se actualiza correctamente', async () => {
            const mockSport: SportDTO = {
                id: 'sport-1',
                name: 'Natación',
                description: 'Nivel inicial',
                max_capacity: 20,
                additional_price: 1500,
                requires_medical_certificate: true,
            };
            updateExecuteSpy.mockResolvedValueOnce(mockSport);

            await controller.update(request, reply);

            expect(updateExecuteSpy).toHaveBeenCalledWith('sport-1', mockRequest.body);
            expect(mockReply.status).toHaveBeenCalledWith(200);
            expect(mockReply.send).toHaveBeenCalledWith({ data: mockSport });
        });

        it('debe devolver status 404 si el deporte no existe', async () => {
            updateExecuteSpy.mockRejectedValueOnce(new Error('El deporte no existe'));

            await controller.update(request, reply);

            expect(mockReply.status).toHaveBeenCalledWith(404);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'El deporte no existe' });
        });

        it('debe devolver status 400 si se intenta modificar el nombre', async () => {
            updateExecuteSpy.mockRejectedValueOnce(new Error('El nombre del deporte no puede modificarse'));

            await controller.update(request, reply);

            expect(mockReply.status).toHaveBeenCalledWith(400);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'El nombre del deporte no puede modificarse' });
        });

        it('debe devolver status 400 si la capacidad máxima es inválida', async () => {
            updateExecuteSpy.mockRejectedValueOnce(new Error('La capacidad máxima debe ser mayor a cero'));

            await controller.update(request, reply);

            expect(mockReply.status).toHaveBeenCalledWith(400);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'La capacidad máxima debe ser mayor a cero' });
        });

        it('debe devolver status 500 ante un error genérico', async () => {
            updateExecuteSpy.mockRejectedValueOnce(new Error('Generic failure'));

            await controller.update(request, reply);

            expect(mockReply.status).toHaveBeenCalledWith(500);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'Error interno, reintente más tarde' });
        });
    });

    describe('delete', () => {
        it('debe devolver status 204 si la eliminación es exitosa', async () => {
            deleteExecuteSpy.mockResolvedValueOnce(undefined);

            await controller.delete(request, reply);

            expect(deleteExecuteSpy).toHaveBeenCalledWith('sport-1');
            expect(mockReply.status).toHaveBeenCalledWith(204);
            expect(mockReply.send).toHaveBeenCalledWith();
        });

        it('debe devolver status 404 si el deporte no existe', async () => {
            deleteExecuteSpy.mockRejectedValueOnce(new Error('El deporte no existe'));

            await controller.delete(request, reply);

            expect(mockReply.status).toHaveBeenCalledWith(404);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'El deporte no existe' });
        });

        it('debe devolver status 500 ante un error genérico al eliminar', async () => {
            deleteExecuteSpy.mockRejectedValueOnce(new Error('DB falló'));

            await controller.delete(request, reply);

            expect(mockReply.status).toHaveBeenCalledWith(500);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'Error interno, reintente más tarde' });
        });
    });
});
