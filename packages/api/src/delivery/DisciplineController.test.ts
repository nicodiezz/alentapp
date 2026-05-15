import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DisciplineController } from './DisciplineController.js';

describe('DisciplineController', () => {
    // 1. Mocks de los Casos de Uso
    const mockCreateUseCase = { execute: vi.fn() };
    const mockGetUseCase = { execute: vi.fn() };

    const controller = new DisciplineController(
        mockCreateUseCase as any,
        mockGetUseCase as any,
    );

    // 2. Mocks de Fastify Request y Reply
    const mockReply = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn()
    };

    const mockRequest = {
        log: { info: vi.fn() },
        body: { reason: 'Pelea' },
        params: { id: '123' }
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('create', () => {
        it('debe devolver status 201 y los datos si la creación es exitosa', async () => {
            const mockSuspension = { id: 'uuid-1', reason: 'Pelea' };
            mockCreateUseCase.execute.mockResolvedValueOnce(mockSuspension);
            
            await controller.create(mockRequest as any, mockReply as any);
            
            expect(mockReply.status).toHaveBeenCalledWith(201);
            expect(mockReply.send).toHaveBeenCalledWith({ data: mockSuspension });
        });

        it('debe devolver status 404 Not Found si el miembro indicado no existe', async () => {
            mockCreateUseCase.execute.mockRejectedValueOnce(new Error('El miembro indicado no existe'));
            
            await controller.create(mockRequest as any, mockReply as any);
            
            expect(mockReply.status).toHaveBeenCalledWith(404);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'El miembro indicado no existe' });
        });

        it('debe devolver status 400 Bad Request si la fecha de fin de suspensión es previa a la fecha de inicio', async () => {
            mockCreateUseCase.execute.mockRejectedValueOnce(new Error('La fecha de fin de suspensión no puede ser previa a la fecha de inicio'));
            
            await controller.create(mockRequest as any, mockReply as any);
            
            expect(mockReply.status).toHaveBeenCalledWith(400);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'La fecha de fin de suspensión no puede ser previa a la fecha de inicio' });
        });

        it('debe devolver status 400 Bad Request si el formato de fecha es inválido', async () => {
            mockCreateUseCase.execute.mockRejectedValueOnce(new Error('Formato de fecha inválido'));
            
            await controller.create(mockRequest as any, mockReply as any);
            
            expect(mockReply.status).toHaveBeenCalledWith(400);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'Formato de fecha inválido' });
        });

        it('debe devolver status 500 para cualquier otro error (ej. error de DB)', async () => {
            mockCreateUseCase.execute.mockRejectedValueOnce(new Error('Error de conexion de Prisma...'));
            
            await controller.create(mockRequest as any, mockReply as any);
            
            expect(mockReply.status).toHaveBeenCalledWith(500);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'Error interno, reintente más tarde' });
        });
    });

    describe('getAll', () => {
        it('debe devolver status 200 y la lista de suspensiones', async () => {
            const mockSuspensiones = [{ id: '1', reason: 'A' }, { id: '2', reason: 'B' }];
            mockGetUseCase.execute.mockResolvedValueOnce(mockSuspensiones);
            
            await controller.getAll(mockRequest as any, mockReply as any);
            
            expect(mockReply.status).toHaveBeenCalledWith(200);
            expect(mockReply.send).toHaveBeenCalledWith({ data: mockSuspensiones });
        });

        it('debe devolver status 500 si falla el caso de uso', async () => {
            mockGetUseCase.execute.mockRejectedValueOnce(new Error('DB Falló'));
            
            await controller.getAll(mockRequest as any, mockReply as any);
            
            expect(mockReply.status).toHaveBeenCalledWith(500);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'Error interno, reintente más tarde' });
        });
    });
});
