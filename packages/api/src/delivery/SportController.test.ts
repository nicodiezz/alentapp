import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SportController } from './SportController.js';

describe('SportController', () => {
    const mockCreateUseCase = { execute: vi.fn() };
    const mockGetUseCase = { execute: vi.fn() };
    const mockUpdateUseCase = { execute: vi.fn() };
    const mockDeleteUseCase = { execute: vi.fn() };

    const controller = new SportController(
        mockCreateUseCase as any,
        mockGetUseCase as any,
        mockUpdateUseCase as any,
        mockDeleteUseCase as any,
    );

    const mockReply = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
    };

    const mockRequest = {
        body: {
            name: 'Natación',
            description: 'Clases en pileta cubierta',
            max_capacity: 20,
            additional_price: 1500,
            requires_medical_certificate: true,
        },
        params: { id: 'sport-1' },
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('create', () => {
        it('debe devolver status 201 y los datos si la creación es exitosa', async () => {
            const mockSport = { id: 'sport-1', name: 'Natación' };
            mockCreateUseCase.execute.mockResolvedValueOnce(mockSport);

            await controller.create(mockRequest as any, mockReply as any);

            expect(mockCreateUseCase.execute).toHaveBeenCalledWith(mockRequest.body);
            expect(mockReply.status).toHaveBeenCalledWith(201);
            expect(mockReply.send).toHaveBeenCalledWith({ data: mockSport });
        });

        it('debe devolver status 409 Conflict si el nombre ya existe', async () => {
            mockCreateUseCase.execute.mockRejectedValueOnce(new Error('Ya existe un deporte con ese nombre'));

            await controller.create(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(409);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'Ya existe un deporte con ese nombre' });
        });

        it('debe devolver status 400 Bad Request si falta un campo requerido', async () => {
            mockCreateUseCase.execute.mockRejectedValueOnce(new Error('El nombre es requerido'));

            await controller.create(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(400);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'El nombre es requerido' });
        });

        it('debe devolver status 400 Bad Request si la capacidad máxima es inválida', async () => {
            mockCreateUseCase.execute.mockRejectedValueOnce(new Error('La capacidad máxima debe ser mayor a cero'));

            await controller.create(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(400);
        });

        it('debe devolver status 500 para cualquier otro error', async () => {
            mockCreateUseCase.execute.mockRejectedValueOnce(new Error('Error de conexión a DB'));

            await controller.create(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(500);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'Error interno, reintente más tarde' });
        });
    });

    describe('getAll', () => {
        it('debe devolver status 200 y la lista de deportes', async () => {
            const mockSports = [{ id: 'sport-1', name: 'Natación' }, { id: 'sport-2', name: 'Tenis' }];
            mockGetUseCase.execute.mockResolvedValueOnce(mockSports);

            await controller.getAll(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(200);
            expect(mockReply.send).toHaveBeenCalledWith({ data: mockSports });
        });

        it('debe devolver status 500 si falla el caso de uso', async () => {
            mockGetUseCase.execute.mockRejectedValueOnce(new Error('DB falló'));

            await controller.getAll(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(500);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'DB falló' });
        });
    });

    describe('update', () => {
        it('debe devolver status 200 y los datos si se actualiza correctamente', async () => {
            const mockSport = { id: 'sport-1', name: 'Natación', description: 'Nivel inicial' };
            mockUpdateUseCase.execute.mockResolvedValueOnce(mockSport);

            await controller.update(mockRequest as any, mockReply as any);

            expect(mockUpdateUseCase.execute).toHaveBeenCalledWith('sport-1', mockRequest.body);
            expect(mockReply.status).toHaveBeenCalledWith(200);
            expect(mockReply.send).toHaveBeenCalledWith({ data: mockSport });
        });

        it('debe devolver status 404 si el deporte no existe', async () => {
            mockUpdateUseCase.execute.mockRejectedValueOnce(new Error('El deporte no existe'));

            await controller.update(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(404);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'El deporte no existe' });
        });

        it('debe devolver status 400 si se intenta modificar el nombre', async () => {
            mockUpdateUseCase.execute.mockRejectedValueOnce(new Error('El nombre del deporte no puede modificarse'));

            await controller.update(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(400);
        });

        it('debe devolver status 500 ante un error genérico', async () => {
            mockUpdateUseCase.execute.mockRejectedValueOnce(new Error('Generic failure'));

            await controller.update(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(500);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'Error interno, reintente más tarde' });
        });
    });

    describe('delete', () => {
        it('debe devolver status 204 si la eliminación es exitosa', async () => {
            mockDeleteUseCase.execute.mockResolvedValueOnce(undefined);

            await controller.delete(mockRequest as any, mockReply as any);

            expect(mockDeleteUseCase.execute).toHaveBeenCalledWith('sport-1');
            expect(mockReply.status).toHaveBeenCalledWith(204);
            expect(mockReply.send).toHaveBeenCalledWith();
        });

        it('debe devolver status 404 si el deporte no existe', async () => {
            mockDeleteUseCase.execute.mockRejectedValueOnce(new Error('El deporte no existe'));

            await controller.delete(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(404);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'El deporte no existe' });
        });

        it('debe devolver status 500 ante un error genérico al eliminar', async () => {
            mockDeleteUseCase.execute.mockRejectedValueOnce(new Error('DB falló'));

            await controller.delete(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(500);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'Error interno, reintente más tarde' });
        });
    });
});
