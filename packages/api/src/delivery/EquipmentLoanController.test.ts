import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EquipmentLoanController } from './EquipmentLoanController.js';

describe('EquipmentLoanController', () => {
    // 1. Mocks de los Casos de Uso
    const mockCreateUseCase = { execute: vi.fn() };
    const mockUpdateUseCase = { execute: vi.fn() };
    const mockGetUseCase = { execute: vi.fn() };
    const mockDeleteUseCase = { execute: vi.fn() };

    const controller = new EquipmentLoanController(
        mockCreateUseCase as any,
        mockUpdateUseCase as any,
        mockGetUseCase as any,
        mockDeleteUseCase as any,
    );

    // 2. Mocks de Fastify Request y Reply
    const mockReply = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
    };

    const mockRequest = {
        log: { info: vi.fn() },
        body: {
            item_name: 'Raqueta',
            loan_date: '2026-05-01',
            due_date: '2026-05-15',
            member_id: 'uuid-member-1',
        },
        params: { id: 'uuid-loan-1' },
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('create', () => {
        it('debe devolver status 201 y los datos si la creación es exitosa', async () => {
            const mockLoan = { id: 'uuid-loan-1', item_name: 'Raqueta', status: 'Loaned' };
            mockCreateUseCase.execute.mockResolvedValueOnce(mockLoan);

            await controller.create(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(201);
            expect(mockReply.send).toHaveBeenCalledWith({ data: mockLoan });
        });

        it('debe devolver status 404 si el socio no existe', async () => {
            mockCreateUseCase.execute.mockRejectedValueOnce(new Error('El socio no existe'));

            await controller.create(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(404);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'El socio no existe' });
        });

        it('debe devolver status 400 si la categoría del socio no le permite tomar préstamos', async () => {
            mockCreateUseCase.execute.mockRejectedValueOnce(
                new Error('La categoría del socio no le permite tomar prestamos'),
            );

            await controller.create(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(400);
            expect(mockReply.send).toHaveBeenCalledWith({
                error: 'La categoría del socio no le permite tomar prestamos',
            });
        });

        it('debe devolver status 400 si la fecha de devolución es inválida', async () => {
            mockCreateUseCase.execute.mockRejectedValueOnce(
                new Error('La fecha de devolución esperada debe ser mayor a la fecha del préstamo'),
            );

            await controller.create(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(400);
            expect(mockReply.send).toHaveBeenCalledWith({
                error: 'La fecha de devolución esperada debe ser mayor a la fecha del préstamo',
            });
        });

        it('debe devolver status 400 si el formato de fecha es inválido', async () => {
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

    describe('update', () => {
        it('debe devolver status 200 y los datos si la actualización es exitosa', async () => {
            const mockLoan = { id: 'uuid-loan-1', item_name: 'Raqueta', status: 'Returned' };
            mockUpdateUseCase.execute.mockResolvedValueOnce(mockLoan);

            await controller.update(mockRequest as any, mockReply as any);

            expect(mockUpdateUseCase.execute).toHaveBeenCalledWith('uuid-loan-1', mockRequest.body);
            expect(mockReply.status).toHaveBeenCalledWith(200);
            expect(mockReply.send).toHaveBeenCalledWith({ data: mockLoan });
        });

        it('debe devolver status 404 si el préstamo no existe', async () => {
            mockUpdateUseCase.execute.mockRejectedValueOnce(new Error('El préstamo no existe'));

            await controller.update(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(404);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'El préstamo no existe' });
        });

        it('debe devolver status 400 si el estado del préstamo es inválido', async () => {
            mockUpdateUseCase.execute.mockRejectedValueOnce(new Error('El estado del préstamo no es válido'));

            await controller.update(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(400);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'El estado del préstamo no es válido' });
        });

        it('debe devolver status 400 si la categoría del socio no le permite tomar préstamos', async () => {
            mockUpdateUseCase.execute.mockRejectedValueOnce(
                new Error('La categoría del socio no le permite tomar prestamos'),
            );

            await controller.update(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(400);
            expect(mockReply.send).toHaveBeenCalledWith({
                error: 'La categoría del socio no le permite tomar prestamos',
            });
        });

        it('debe devolver status 400 si la fecha de devolución es inválida', async () => {
            mockUpdateUseCase.execute.mockRejectedValueOnce(
                new Error('La fecha de devolución esperada debe ser mayor a la fecha del préstamo'),
            );

            await controller.update(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(400);
            expect(mockReply.send).toHaveBeenCalledWith({
                error: 'La fecha de devolución esperada debe ser mayor a la fecha del préstamo',
            });
        });

        it('debe devolver status 404 si el socio no existe', async () => {
            mockUpdateUseCase.execute.mockRejectedValueOnce(new Error('El socio no existe'));

            await controller.update(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(404);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'El socio no existe' });
        });

        it('debe devolver status 500 ante un error genérico (ej: error de BD)', async () => {
            mockUpdateUseCase.execute.mockRejectedValueOnce(new Error('Generic failure'));

            await controller.update(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(500);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'Error interno, reintente más tarde' });
        });
    });

    describe('getAll', () => {
        it('debe devolver status 200 y la lista de préstamos', async () => {
            const mockLoans = [{ id: '1' }, { id: '2' }];
            mockGetUseCase.execute.mockResolvedValueOnce(mockLoans);

            await controller.getAll(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(200);
            expect(mockReply.send).toHaveBeenCalledWith({ data: mockLoans });
        });

        it('debe devolver status 500 si falla el caso de uso', async () => {
            mockGetUseCase.execute.mockRejectedValueOnce(new Error('DB Falló'));

            await controller.getAll(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(500);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'DB Falló' });
        });
    });

    describe('delete', () => {
        it('debe devolver status 204 si la eliminación es exitosa', async () => {
            mockDeleteUseCase.execute.mockResolvedValueOnce(undefined);

            await controller.delete(mockRequest as any, mockReply as any);

            expect(mockDeleteUseCase.execute).toHaveBeenCalledWith('uuid-loan-1');
            expect(mockReply.status).toHaveBeenCalledWith(204);
            expect(mockReply.send).toHaveBeenCalledWith();
        });

        it('debe devolver status 404 si el préstamo de equipamiento no existe', async () => {
            mockDeleteUseCase.execute.mockRejectedValueOnce(new Error('El préstamo de equipamiento no existe'));

            await controller.delete(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(404);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'El préstamo de equipamiento no existe' });
        });

        it('debe devolver status 500 ante un error genérico (ej: error de BD)', async () => {
            mockDeleteUseCase.execute.mockRejectedValueOnce(new Error('Generic failure'));

            await controller.delete(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(500);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'Generic failure' });
        });
    });
});
