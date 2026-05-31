import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentController } from './PaymentController.js';
import { CreatePaymentUseCase } from '../application/NewPaymentUseCase.js';
import { GetPaymentsUseCase } from '../application/GetPaymentsUseCase.js';
import { GetPaymentByIdUseCase } from '../application/GetPaymentUseCase.js';
import { UpdatePaymentUseCase } from '../application/UpdatePaymentUseCase.js';
import { CancelPaymentUseCase } from '../application/CancelPaymentUseCase.js';
import { CreatePaymentRequest, UpdatePaymentRequest, PaymentDTO } from '@alentapp/shared';
import { FastifyRequest, FastifyReply } from 'fastify';

describe('PaymentController', () => {
    const mockCreateUseCase: Partial<CreatePaymentUseCase> = { execute: vi.fn() };
    const mockFindAllUseCase: Partial<GetPaymentsUseCase> = { execute: vi.fn() };
    const mockFindByIdUseCase: Partial<GetPaymentByIdUseCase> = { execute: vi.fn() };
    const mockUpdateUseCase: Partial<UpdatePaymentUseCase> = { execute: vi.fn() };
    const mockCancelUseCase: Partial<CancelPaymentUseCase> = { execute: vi.fn() };

    const controller = new PaymentController(
        mockCreateUseCase as CreatePaymentUseCase,
        mockFindAllUseCase as GetPaymentsUseCase,
        mockFindByIdUseCase as GetPaymentByIdUseCase,
        mockUpdateUseCase as UpdatePaymentUseCase,
        mockCancelUseCase as CancelPaymentUseCase,
    );

    const mockReply = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
    } as Partial<FastifyReply> as FastifyReply;

    const mockRequest = {
        body: {
            member_id: 'uuid-member-1',
            amount: 1500,
            month: 5,
            year: 2026,
            status: 'Pending',
            due_date: '2026-06-30',
        } satisfies CreatePaymentRequest,
        params: { id: 'uuid-payment-1' },
    } as Partial<FastifyRequest<{ Body: CreatePaymentRequest; Params: { id: string } }>> as FastifyRequest<{ Body: CreatePaymentRequest; Params: { id: string } }>;

    const mockUpdateRequest = {
        body: {
            amount: 2000,
            status: 'Paid',
            payment_date: '2026-05-29T20:00:00.000Z',
        } satisfies UpdatePaymentRequest,
        params: { id: 'uuid-payment-1' },
    } as Partial<FastifyRequest<{ Body: UpdatePaymentRequest; Params: { id: string } }>> as FastifyRequest<{ Body: UpdatePaymentRequest; Params: { id: string } }>;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('create', () => {
        it('debe devolver status 201 y los datos si la creación es exitosa', async () => {
            const mockPayment = { id: 'uuid-payment-1', amount: 1500, status: 'Pending' } as Partial<PaymentDTO> as PaymentDTO;
            vi.mocked(mockCreateUseCase.execute!).mockResolvedValueOnce(mockPayment);

            await controller.create(mockRequest, mockReply);

            expect(mockReply.status).toHaveBeenCalledWith(201);
            expect(mockReply.send).toHaveBeenCalledWith({ data: mockPayment });
        });

        it('debe devolver status 400 si el error contiene la palabra "inválido"', async () => {
            vi.mocked(mockCreateUseCase.execute!).mockRejectedValueOnce(new Error('Monto inválido'));

            await controller.create(mockRequest, mockReply);

            expect(mockReply.status).toHaveBeenCalledWith(400);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'Monto inválido' });
        });

        it('debe devolver status 400 si el error contiene la palabra "debe"', async () => {
            vi.mocked(mockCreateUseCase.execute!).mockRejectedValueOnce(new Error('El mes debe estar entre 1 y 12'));

            await controller.create(mockRequest, mockReply);

            expect(mockReply.status).toHaveBeenCalledWith(400);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'El mes debe estar entre 1 y 12' });
        });

        it('debe devolver status 400 si el error contiene la palabra "obligatoria"', async () => {
            vi.mocked(mockCreateUseCase.execute!).mockRejectedValueOnce(new Error('La fecha de pago es obligatoria si el estado es Pagado'));

            await controller.create(mockRequest, mockReply);

            expect(mockReply.status).toHaveBeenCalledWith(400);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'La fecha de pago es obligatoria si el estado es Pagado' });
        });

        it('debe devolver status 404 si el error contiene la palabra "No existe"', async () => {
            vi.mocked(mockCreateUseCase.execute!).mockRejectedValueOnce(new Error('No existe un miembro con ese ID'));

            await controller.create(mockRequest, mockReply);

            expect(mockReply.status).toHaveBeenCalledWith(404);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'No existe un miembro con ese ID' });
        });

        it('debe devolver status 500 ante cualquier otro error no controlado', async () => {
            vi.mocked(mockCreateUseCase.execute!).mockRejectedValueOnce(new Error('Fallo en el servidor'));

            await controller.create(mockRequest, mockReply);

            expect(mockReply.status).toHaveBeenCalledWith(500);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'Error interno, reintente más tarde' });
        });
    });

    describe('findAll', () => {
        it('debe devolver status 200 y el listado de pagos si es exitoso', async () => {
            const mockPayments = [{ id: '1' }, { id: '2' }] as Partial<PaymentDTO>[] as PaymentDTO[];
            vi.mocked(mockFindAllUseCase.execute!).mockResolvedValueOnce(mockPayments);

            await controller.findAll(mockRequest, mockReply);

            expect(mockReply.status).toHaveBeenCalledWith(200);
            expect(mockReply.send).toHaveBeenCalledWith({ data: mockPayments });
        });

        it('debe devolver status 500 si falla el caso de uso', async () => {
            vi.mocked(mockFindAllUseCase.execute!).mockRejectedValueOnce(new Error('Fallo en el servidor'));

            await controller.findAll(mockRequest, mockReply);

            expect(mockReply.status).toHaveBeenCalledWith(500);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'Error interno, reintente más tarde' });
        });
    });

    describe('findById', () => {
        it('debe devolver status 200 y el pago buscado si es exitoso', async () => {
            const mockPayment = { id: 'uuid-payment-1', amount: 100 } as Partial<PaymentDTO> as PaymentDTO;
            vi.mocked(mockFindByIdUseCase.execute!).mockResolvedValueOnce(mockPayment);

            await controller.findById(mockRequest, mockReply);

            expect(mockReply.status).toHaveBeenCalledWith(200);
            expect(mockReply.send).toHaveBeenCalledWith({ data: mockPayment });
        });

        it('debe devolver status 500 si falla al buscar el pago', async () => {
            vi.mocked(mockFindByIdUseCase.execute!).mockRejectedValueOnce(new Error('Fallo en el servidor'));

            await controller.findById(mockRequest, mockReply);

            expect(mockReply.status).toHaveBeenCalledWith(500);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'Error interno, reintente más tarde' });
        });

        it('debe devolver status 404 si el pago no existe ("No existe")', async () => {
            vi.mocked(mockFindByIdUseCase.execute!).mockRejectedValueOnce(new Error('No existe un pago con ese ID'));

            await controller.findById(mockRequest, mockReply);

            expect(mockReply.status).toHaveBeenCalledWith(404);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'No existe un pago con ese ID' });
        });
    });

    describe('update', () => {
        it('debe devolver status 200 y los datos actualizados si es exitoso', async () => {
            const mockPayment = { id: 'uuid-payment-1', amount: 2000, status: 'Paid' } as Partial<PaymentDTO> as PaymentDTO;
            vi.mocked(mockUpdateUseCase.execute!).mockResolvedValueOnce(mockPayment);

            await controller.update(mockUpdateRequest, mockReply);

            expect(mockUpdateUseCase.execute).toHaveBeenCalledWith('uuid-payment-1', mockUpdateRequest.body);
            expect(mockReply.status).toHaveBeenCalledWith(200);
            expect(mockReply.send).toHaveBeenCalledWith({ data: mockPayment });
        });

        it('debe devolver status 400 si la validación falla con "inválido"', async () => {
            vi.mocked(mockUpdateUseCase.execute!).mockRejectedValueOnce(new Error('Año inválido'));

            await controller.update(mockUpdateRequest, mockReply);

            expect(mockReply.status).toHaveBeenCalledWith(400);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'Año inválido' });
        });

        it('debe devolver status 400 si la validación falla con "debe"', async () => {
            vi.mocked(mockUpdateUseCase.execute!).mockRejectedValueOnce(new Error('El año debe ser mayor o igual al año actual'));

            await controller.update(mockUpdateRequest, mockReply);

            expect(mockReply.status).toHaveBeenCalledWith(400);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'El año debe ser mayor o igual al año actual' });
        });

        it('debe devolver status 400 si la validación falla con "obligatoria"', async () => {
            vi.mocked(mockUpdateUseCase.execute!).mockRejectedValueOnce(new Error('La fecha de pago es obligatoria si el estado es Pagado'));

            await controller.update(mockUpdateRequest, mockReply);

            expect(mockReply.status).toHaveBeenCalledWith(400);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'La fecha de pago es obligatoria si el estado es Pagado' });
        });

        it('debe devolver status 404 si el pago o el miembro no existen ("No existe")', async () => {
            vi.mocked(mockUpdateUseCase.execute!).mockRejectedValueOnce(new Error('No existe un miembro con ese ID'));

            await controller.update(mockUpdateRequest, mockReply);

            expect(mockReply.status).toHaveBeenCalledWith(404);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'No existe un miembro con ese ID' });
        });

        it('debe devolver status 500 ante cualquier error inesperado', async () => {
            vi.mocked(mockUpdateUseCase.execute!).mockRejectedValueOnce(new Error('Fallo en el servidor'));

            await controller.update(mockUpdateRequest, mockReply);

            expect(mockReply.status).toHaveBeenCalledWith(500);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'Error interno, reintente más tarde' });
        });
    });

    describe('cancel', () => {
        it('debe devolver status 204 sin contenido si la cancelación es exitosa', async () => {
            const mockPayment = { id: 'uuid-payment-1', status: 'Canceled' } as Partial<PaymentDTO> as PaymentDTO;
            vi.mocked(mockCancelUseCase.execute!).mockResolvedValueOnce(mockPayment);

            await controller.cancel(mockRequest, mockReply);

            expect(mockCancelUseCase.execute).toHaveBeenCalledWith('uuid-payment-1');
            expect(mockReply.status).toHaveBeenCalledWith(204);
            expect(mockReply.send).toHaveBeenCalledWith();
        });

        it('debe devolver status 409 si el pago ya se encuentra cancelado', async () => {
            vi.mocked(mockCancelUseCase.execute!).mockRejectedValueOnce(new Error('El pago ya se encuentra cancelado'));

            await controller.cancel(mockRequest, mockReply);

            expect(mockReply.status).toHaveBeenCalledWith(409);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'El pago ya se encuentra cancelado' });
        });

        it('debe devolver status 404 si el pago no existe ("No existe")', async () => {
            vi.mocked(mockCancelUseCase.execute!).mockRejectedValueOnce(new Error('No existe un pago con ese ID'));

            await controller.cancel(mockRequest, mockReply);

            expect(mockReply.status).toHaveBeenCalledWith(404);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'No existe un pago con ese ID' });
        });

        it('debe devolver status 500 ante un error genérico', async () => {
            vi.mocked(mockCancelUseCase.execute!).mockRejectedValueOnce(new Error('Fallo en el servidor'));

            await controller.cancel(mockRequest, mockReply);

            expect(mockReply.status).toHaveBeenCalledWith(500);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'Error interno, reintente más tarde' });
        });
    });
});