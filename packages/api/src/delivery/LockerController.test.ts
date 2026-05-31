import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FastifyReply, FastifyRequest } from 'fastify';
import { CreateLockerRequest, LockerDTO, UpdateLockerRequest } from '@alentapp/shared';
import { DeleteLockerUseCase } from '../application/DeleteLockerUseCase.js';
import { GetLockersUseCase } from '../application/GetLockersUseCase.js';
import { CreateLockerUseCase } from '../application/NewLockerUseCase.js';
import { UpdateLockerUseCase } from '../application/UpdateLockerUseCase.js';
import { LockerRepository } from '../domain/LockerRepository.js';
import { LockerValidator } from '../domain/services/LockerValidator.js';
import { MemberRepository } from '../domain/MemberRepository.js';
import { LockerController } from './LockerController.js';

describe('LockerController', () => {
    const lockerRepo: LockerRepository = {
        create: vi.fn(),
        findAll: vi.fn(),
        findById: vi.fn(),
        findByNumber: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    };

    const memberRepo = {
        findById: vi.fn(),
    } as unknown as MemberRepository;

    const lockerValidator = new LockerValidator(lockerRepo);
    const createUseCase = new CreateLockerUseCase(lockerRepo, lockerValidator);
    const getUseCase = new GetLockersUseCase(lockerRepo);
    const updateUseCase = new UpdateLockerUseCase(lockerRepo, lockerValidator, memberRepo);
    const deleteUseCase = new DeleteLockerUseCase(lockerRepo);

    const createExecuteSpy = vi.spyOn(createUseCase, 'execute');
    const getExecuteSpy = vi.spyOn(getUseCase, 'execute');
    const updateExecuteSpy = vi.spyOn(updateUseCase, 'execute');
    const deleteExecuteSpy = vi.spyOn(deleteUseCase, 'execute');

    const controller = new LockerController(
        createUseCase,
        getUseCase,
        updateUseCase,
        deleteUseCase,
    );

    const mockReply: Pick<FastifyReply, 'status' | 'send'> = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
    };

    type LockerRequest = FastifyRequest<{
        Body: CreateLockerRequest & UpdateLockerRequest;
        Params: { id: string };
    }>;

    const mockRequest: Partial<LockerRequest> = {
        body: {
            number: 10,
            location: 'Vestuario A',
        },
        params: { id: 'locker-1' },
    };

    const request = mockRequest as LockerRequest;
    const reply = mockReply as FastifyReply;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('create', () => {
        it('debe devolver status 201 y los datos si la creación es exitosa', async () => {
            const mockLocker: LockerDTO = {
                id: 'locker-1',
                number: 10,
                location: 'Vestuario A',
                status: 'Available',
                member_id: null,
            };
            createExecuteSpy.mockResolvedValueOnce(mockLocker);

            await controller.create(request, reply);

            expect(createExecuteSpy).toHaveBeenCalledWith(mockRequest.body);
            expect(mockReply.status).toHaveBeenCalledWith(201);
            expect(mockReply.send).toHaveBeenCalledWith({ data: mockLocker });
        });

        it('debe devolver status 409 Conflict si el número ya existe', async () => {
            createExecuteSpy.mockRejectedValueOnce(new Error('Ya existe un casillero con ese número'));

            await controller.create(request, reply);

            expect(mockReply.status).toHaveBeenCalledWith(409);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'Ya existe un casillero con ese número' });
        });

        it('debe devolver status 400 Bad Request si el número es requerido', async () => {
            createExecuteSpy.mockRejectedValueOnce(new Error('El número de casillero es requerido'));

            await controller.create(request, reply);

            expect(mockReply.status).toHaveBeenCalledWith(400);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'El número de casillero es requerido' });
        });

        it('debe devolver status 400 Bad Request si el número no es válido', async () => {
            createExecuteSpy.mockRejectedValueOnce(new Error('El número de casillero debe ser numérico'));

            await controller.create(request, reply);

            expect(mockReply.status).toHaveBeenCalledWith(400);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'El número de casillero debe ser numérico' });
        });

        it('debe devolver status 500 para cualquier otro error', async () => {
            createExecuteSpy.mockRejectedValueOnce(new Error('Error de conexión a DB'));

            await controller.create(request, reply);

            expect(mockReply.status).toHaveBeenCalledWith(500);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'Error interno, reintente mas tarde' });
        });
    });

    describe('getAll', () => {
        it('debe devolver status 200 y la lista de casilleros', async () => {
            const mockLockers: LockerDTO[] = [
                {
                    id: 'locker-1',
                    number: 10,
                    location: 'Vestuario A',
                    status: 'Available',
                    member_id: null,
                },
                {
                    id: 'locker-2',
                    number: 20,
                    location: 'Vestuario B',
                    status: 'Occupied',
                    member_id: 'member-1',
                },
            ];
            getExecuteSpy.mockResolvedValueOnce(mockLockers);

            await controller.getAll(request, reply);

            expect(mockReply.status).toHaveBeenCalledWith(200);
            expect(mockReply.send).toHaveBeenCalledWith({ data: mockLockers });
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
            const mockLocker: LockerDTO = {
                id: 'locker-1',
                number: 10,
                location: 'Vestuario C',
                status: 'Available',
                member_id: null,
            };
            updateExecuteSpy.mockResolvedValueOnce(mockLocker);

            await controller.update(request, reply);

            expect(updateExecuteSpy).toHaveBeenCalledWith('locker-1', mockRequest.body);
            expect(mockReply.status).toHaveBeenCalledWith(200);
            expect(mockReply.send).toHaveBeenCalledWith({ data: mockLocker });
        });

        it('debe devolver status 404 si el casillero no existe', async () => {
            updateExecuteSpy.mockRejectedValueOnce(new Error('El casillero no existe'));

            await controller.update(request, reply);

            expect(mockReply.status).toHaveBeenCalledWith(404);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'El casillero no existe' });
        });

        it('debe devolver status 404 si el miembro indicado no existe', async () => {
            updateExecuteSpy.mockRejectedValueOnce(new Error('El miembro indicado no existe'));

            await controller.update(request, reply);

            expect(mockReply.status).toHaveBeenCalledWith(404);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'El miembro indicado no existe' });
        });

        it('debe devolver status 409 si el número de casillero ya existe', async () => {
            updateExecuteSpy.mockRejectedValueOnce(new Error('Ya existe un casillero con ese número'));

            await controller.update(request, reply);

            expect(mockReply.status).toHaveBeenCalledWith(409);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'Ya existe un casillero con ese número' });
        });

        it('debe devolver status 409 si se intenta asignar casillero en mantenimiento', async () => {
            updateExecuteSpy.mockRejectedValueOnce(new Error('No se puede asignar un casillero en mantenimiento'));

            await controller.update(request, reply);

            expect(mockReply.status).toHaveBeenCalledWith(409);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'No se puede asignar un casillero en mantenimiento' });
        });

        it('debe devolver status 400 si la ubicación es inválida', async () => {
            updateExecuteSpy.mockRejectedValueOnce(new Error('La ubicación es requerida'));

            await controller.update(request, reply);

            expect(mockReply.status).toHaveBeenCalledWith(400);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'La ubicación es requerida' });
        });

        it('debe devolver status 500 ante un error genérico', async () => {
            updateExecuteSpy.mockRejectedValueOnce(new Error('Generic failure'));

            await controller.update(request, reply);

            expect(mockReply.status).toHaveBeenCalledWith(500);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'Error interno, reintente mas tarde' });
        });
    });

    describe('delete', () => {
        it('debe devolver status 204 si la eliminación es exitosa', async () => {
            deleteExecuteSpy.mockResolvedValueOnce(undefined);

            await controller.delete(request, reply);

            expect(deleteExecuteSpy).toHaveBeenCalledWith('locker-1');
            expect(mockReply.status).toHaveBeenCalledWith(204);
            expect(mockReply.send).toHaveBeenCalledWith();
        });

        it('debe devolver status 404 si el casillero no existe', async () => {
            deleteExecuteSpy.mockRejectedValueOnce(new Error('El Locker no existe'));

            await controller.delete(request, reply);

            expect(mockReply.status).toHaveBeenCalledWith(404);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'El Locker no existe' });
        });

        it('debe devolver status 400 ante un error genérico al eliminar', async () => {
            deleteExecuteSpy.mockRejectedValueOnce(new Error('Error inesperado'));

            await controller.delete(request, reply);

            expect(mockReply.status).toHaveBeenCalledWith(400);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'Error inesperado' });
        });
    });
});
