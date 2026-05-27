import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MedicalCertificateController } from './MedicalCertificateController.js';

describe('MedicalCertificateController', () => {
    // 1. Mocks de los Casos de Uso
    const mockCreateUseCase = { execute: vi.fn() };
    const mockGetUseCase = { execute: vi.fn() };
    const mockUpdateUseCase = { execute: vi.fn() };
    const mockDeleteUseCase = { execute: vi.fn() };

    const controller = new MedicalCertificateController(
        mockCreateUseCase as any,
        mockGetUseCase as any,
        mockUpdateUseCase as any,
        mockDeleteUseCase as any
    );

    // 2. Mocks de Fastify Request y Reply
    const mockReply = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn()
    };

    const mockRequest = {
        log: { info: vi.fn() },
        body: { doctor_license: 'MED-123' },
        params: { id: 'uuid-cert-1' }
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('create', () => {
        it('debe devolver status 201 y los datos si la creación es exitosa', async () => {
            const mockCertificate = { id: 'uuid-cert-1', doctor_license: 'MED-123' };
            mockCreateUseCase.execute.mockResolvedValueOnce(mockCertificate);

            await controller.create(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(201);
            expect(mockReply.send).toHaveBeenCalledWith({ data: mockCertificate });
        });

        it('debe devolver status 400 si faltan campos requeridos', async () => {
            mockCreateUseCase.execute.mockRejectedValueOnce(new Error('Todos los campos son requeridos'));

            await controller.create(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(400);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'Todos los campos son requeridos' });
        });

        it('debe devolver status 400 si la fecha de vencimiento es previa a la de emisión', async () => {
            mockCreateUseCase.execute.mockRejectedValueOnce(new Error('La fecha de vencimiento no puede ser previa a la fecha de emision'));

            await controller.create(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(400);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'La fecha de vencimiento no puede ser previa a la fecha de emision' });
        });

        it('debe devolver status 404 si el member_id no existe', async () => {
            mockCreateUseCase.execute.mockRejectedValueOnce(new Error('El socio indicado no existe'));

            await controller.create(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(404);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'El socio indicado no existe' });
        });

        it('debe devolver status 500 para cualquier otro error (ej. error de DB)', async () => {
            mockCreateUseCase.execute.mockRejectedValueOnce(new Error('Error de conexion de Prisma...'));

            await controller.create(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(500);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'Error interno, reintente más tarde' });
        });
    });

    describe('delete', () => {
        it('debe devolver status 204 si la eliminación es exitosa', async () => {
            mockDeleteUseCase.execute.mockResolvedValueOnce(undefined);

            await controller.delete(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(204);
            expect(mockReply.send).toHaveBeenCalledWith();
        });

        it('debe devolver status 400 si el certificado no existe', async () => {
            mockDeleteUseCase.execute.mockRejectedValueOnce(new Error('El certificado no existe'));

            await controller.delete(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(400);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'El certificado no existe' });
        });

        it('debe devolver status 500 ante un error genérico (ej: error de BD)', async () => {
            mockDeleteUseCase.execute.mockRejectedValueOnce(new Error('Generic failure'));

            await controller.delete(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(500);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'Error interno, reintente más tarde' });
        });
    });

    describe('getAll', () => {
        it('debe devolver status 200 y la lista de certificados', async () => {
            const mockCertificates = [{ id: '1' }, { id: '2' }];
            mockGetUseCase.execute.mockResolvedValueOnce(mockCertificates);

            await controller.getAll(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(200);
            expect(mockReply.send).toHaveBeenCalledWith({ data: mockCertificates });
        });

        it('debe devolver status 500 si falla el caso de uso', async () => {
            mockGetUseCase.execute.mockRejectedValueOnce(new Error('DB Falló'));

            await controller.getAll(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(500);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'DB Falló' });
        });
    });

    describe('update', () => {
        it('debe devolver status 200 y los datos si la actualización es exitosa', async () => {
            const mockCertificate = { id: 'uuid-cert-1', doctor_license: 'MED-999' };
            mockUpdateUseCase.execute.mockResolvedValueOnce(mockCertificate);

            await controller.update(mockRequest as any, mockReply as any);

            expect(mockUpdateUseCase.execute).toHaveBeenCalledWith('uuid-cert-1', { doctor_license: 'MED-123' });
            expect(mockReply.status).toHaveBeenCalledWith(200);
            expect(mockReply.send).toHaveBeenCalledWith({ data: mockCertificate });
        });

        it('debe devolver status 400 si el certificado no existe, las fechas son inválidas (expiry_date anterior a issue_date) o el formato es incorrecto', async () => {
            mockUpdateUseCase.execute.mockRejectedValueOnce(new Error('El certificado no existe'));

            await controller.update(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(400);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'El certificado no existe' });
        });

        it('debe devolver status 500 ante un error genérico', async () => {
            mockUpdateUseCase.execute.mockRejectedValueOnce(new Error('Generic failure'));

            await controller.update(mockRequest as any, mockReply as any);

            expect(mockReply.status).toHaveBeenCalledWith(500);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'Error interno, reintente más tarde' });
        });
    });
});