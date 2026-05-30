import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FastifyRequest, FastifyReply } from 'fastify';
import { EquipmentLoanController } from './EquipmentLoanController.js';
import { CreateEquipmentLoanUseCase } from '../application/NewEquipmentLoanUseCase.js';
import { UpdateEquipmentLoanUseCase } from '../application/UpdateEquipmentLoanUseCase.js';
import { GetEquipmentLoansUseCase } from '../application/GetEquipmentLoansUseCase.js';
import { DeleteEquipmentLoanUseCase } from '../application/DeleteEquipmentLoanUseCase.js';
import {
    CreateEquipmentLoanRequest,
    UpdateEquipmentLoanRequest,
    EquipmentLoanDTO,
} from '@alentapp/shared';

describe('EquipmentLoanController', () => {
    // 1. Mocks tipados de los Casos de Uso usando Pick para exponer únicamente `execute`.
    //    Los UseCases son clases con dependencias privadas, por eso un Pick + cast al tipo
    //    de la clase es más seguro que `as unknown as`.
    type CreateUseCaseMock = Pick<CreateEquipmentLoanUseCase, 'execute'>;
    type UpdateUseCaseMock = Pick<UpdateEquipmentLoanUseCase, 'execute'>;
    type GetUseCaseMock = Pick<GetEquipmentLoansUseCase, 'execute'>;
    type DeleteUseCaseMock = Pick<DeleteEquipmentLoanUseCase, 'execute'>;

    const mockCreateUseCase: CreateUseCaseMock = { execute: vi.fn() };
    const mockUpdateUseCase: UpdateUseCaseMock = { execute: vi.fn() };
    const mockGetUseCase: GetUseCaseMock = { execute: vi.fn() };
    const mockDeleteUseCase: DeleteUseCaseMock = { execute: vi.fn() };

    const controller = new EquipmentLoanController(
        mockCreateUseCase as CreateEquipmentLoanUseCase,
        mockUpdateUseCase as UpdateEquipmentLoanUseCase,
        mockGetUseCase as GetEquipmentLoansUseCase,
        mockDeleteUseCase as DeleteEquipmentLoanUseCase,
    );

    // 2. Mocks tipados de Fastify Request y Reply.
    //    Cada método del controller declara un FastifyRequest con generics propios,
    //    por lo que tipamos las requests con esos generics y exponemos solo `body` y `params`.
    type ReplyMock = Pick<FastifyReply, 'status' | 'send'>;
    type CreateRequestMock = Pick<FastifyRequest<{ Body: CreateEquipmentLoanRequest }>, 'body'>;
    type UpdateRequestMock = Pick<
        FastifyRequest<{ Params: { id: string }; Body: UpdateEquipmentLoanRequest }>,
        'body' | 'params'
    >;
    type DeleteRequestMock = Pick<FastifyRequest<{ Params: { id: string } }>, 'params'>;

    const mockReply: ReplyMock = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
    };

    const requestBody: CreateEquipmentLoanRequest & UpdateEquipmentLoanRequest = {
        item_name: 'Raqueta',
        loan_date: '2026-05-01',
        due_date: '2026-05-15',
        member_id: 'uuid-member-1',
    };

    const mockCreateRequest: CreateRequestMock = { body: requestBody };
    const mockUpdateRequest: UpdateRequestMock = {
        body: requestBody,
        params: { id: 'uuid-loan-1' },
    };
    const mockGetRequest: Pick<FastifyRequest, 'body' | 'params'> = {
        body: requestBody,
        params: { id: 'uuid-loan-1' },
    };
    const mockDeleteRequest: DeleteRequestMock = { params: { id: 'uuid-loan-1' } };

    const createReq = mockCreateRequest as FastifyRequest<{ Body: CreateEquipmentLoanRequest }>;
    const updateReq = mockUpdateRequest as FastifyRequest<{
        Params: { id: string };
        Body: UpdateEquipmentLoanRequest;
    }>;
    const getReq = mockGetRequest as FastifyRequest;
    const deleteReq = mockDeleteRequest as FastifyRequest<{ Params: { id: string } }>;
    const asReply = mockReply as FastifyReply;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('create', () => {
        it('debe devolver status 201 y los datos si la creación es exitosa', async () => {
            const mockLoan: EquipmentLoanDTO = {
                id: 'uuid-loan-1',
                item_name: 'Raqueta',
                status: 'Loaned',
                loan_date: '2026-05-01',
                due_date: '2026-05-15',
                member_id: 'uuid-member-1',
            };
            vi.mocked(mockCreateUseCase.execute).mockResolvedValueOnce(mockLoan);

            await controller.create(createReq, asReply);

            expect(mockReply.status).toHaveBeenCalledWith(201);
            expect(mockReply.send).toHaveBeenCalledWith({ data: mockLoan });
        });

        it('debe devolver status 404 si el socio no existe', async () => {
            vi.mocked(mockCreateUseCase.execute).mockRejectedValueOnce(new Error('El socio no existe'));

            await controller.create(createReq, asReply);

            expect(mockReply.status).toHaveBeenCalledWith(404);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'El socio no existe' });
        });

        it('debe devolver status 400 si la categoría del socio no le permite tomar préstamos', async () => {
            vi.mocked(mockCreateUseCase.execute).mockRejectedValueOnce(
                new Error('La categoría del socio no le permite tomar prestamos'),
            );

            await controller.create(createReq, asReply);

            expect(mockReply.status).toHaveBeenCalledWith(400);
            expect(mockReply.send).toHaveBeenCalledWith({
                error: 'La categoría del socio no le permite tomar prestamos',
            });
        });

        it('debe devolver status 400 si la fecha de devolución es inválida', async () => {
            vi.mocked(mockCreateUseCase.execute).mockRejectedValueOnce(
                new Error('La fecha de devolución esperada debe ser mayor a la fecha del préstamo'),
            );

            await controller.create(createReq, asReply);

            expect(mockReply.status).toHaveBeenCalledWith(400);
            expect(mockReply.send).toHaveBeenCalledWith({
                error: 'La fecha de devolución esperada debe ser mayor a la fecha del préstamo',
            });
        });

        it('debe devolver status 400 si el formato de fecha es inválido', async () => {
            vi.mocked(mockCreateUseCase.execute).mockRejectedValueOnce(new Error('Formato de fecha inválido'));

            await controller.create(createReq, asReply);

            expect(mockReply.status).toHaveBeenCalledWith(400);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'Formato de fecha inválido' });
        });

        it('debe devolver status 500 para cualquier otro error (ej. error de DB)', async () => {
            vi.mocked(mockCreateUseCase.execute).mockRejectedValueOnce(new Error('Error de conexion de Prisma...'));

            await controller.create(createReq, asReply);

            expect(mockReply.status).toHaveBeenCalledWith(500);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'Error interno, reintente más tarde' });
        });
    });

    describe('update', () => {
        it('debe devolver status 200 y los datos si la actualización es exitosa', async () => {
            const mockLoan: EquipmentLoanDTO = {
                id: 'uuid-loan-1',
                item_name: 'Raqueta',
                status: 'Returned',
                loan_date: '2026-05-01',
                due_date: '2026-05-15',
                member_id: 'uuid-member-1',
            };
            vi.mocked(mockUpdateUseCase.execute).mockResolvedValueOnce(mockLoan);

            await controller.update(updateReq, asReply);

            expect(mockUpdateUseCase.execute).toHaveBeenCalledWith('uuid-loan-1', requestBody);
            expect(mockReply.status).toHaveBeenCalledWith(200);
            expect(mockReply.send).toHaveBeenCalledWith({ data: mockLoan });
        });

        it('debe devolver status 404 si el préstamo no existe', async () => {
            vi.mocked(mockUpdateUseCase.execute).mockRejectedValueOnce(new Error('El préstamo no existe'));

            await controller.update(updateReq, asReply);

            expect(mockReply.status).toHaveBeenCalledWith(404);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'El préstamo no existe' });
        });

        it('debe devolver status 400 si el estado del préstamo es inválido', async () => {
            vi.mocked(mockUpdateUseCase.execute).mockRejectedValueOnce(
                new Error('El estado del préstamo no es válido'),
            );

            await controller.update(updateReq, asReply);

            expect(mockReply.status).toHaveBeenCalledWith(400);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'El estado del préstamo no es válido' });
        });

        it('debe devolver status 400 si la categoría del socio no le permite tomar préstamos', async () => {
            vi.mocked(mockUpdateUseCase.execute).mockRejectedValueOnce(
                new Error('La categoría del socio no le permite tomar prestamos'),
            );

            await controller.update(updateReq, asReply);

            expect(mockReply.status).toHaveBeenCalledWith(400);
            expect(mockReply.send).toHaveBeenCalledWith({
                error: 'La categoría del socio no le permite tomar prestamos',
            });
        });

        it('debe devolver status 400 si la fecha de devolución es inválida', async () => {
            vi.mocked(mockUpdateUseCase.execute).mockRejectedValueOnce(
                new Error('La fecha de devolución esperada debe ser mayor a la fecha del préstamo'),
            );

            await controller.update(updateReq, asReply);

            expect(mockReply.status).toHaveBeenCalledWith(400);
            expect(mockReply.send).toHaveBeenCalledWith({
                error: 'La fecha de devolución esperada debe ser mayor a la fecha del préstamo',
            });
        });

        it('debe devolver status 404 si el socio no existe', async () => {
            vi.mocked(mockUpdateUseCase.execute).mockRejectedValueOnce(new Error('El socio no existe'));

            await controller.update(updateReq, asReply);

            expect(mockReply.status).toHaveBeenCalledWith(404);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'El socio no existe' });
        });

        it('debe devolver status 500 ante un error genérico (ej: error de BD)', async () => {
            vi.mocked(mockUpdateUseCase.execute).mockRejectedValueOnce(new Error('Generic failure'));

            await controller.update(updateReq, asReply);

            expect(mockReply.status).toHaveBeenCalledWith(500);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'Error interno, reintente más tarde' });
        });
    });

    describe('getAll', () => {
        it('debe devolver status 200 y la lista de préstamos', async () => {
            const mockLoans: EquipmentLoanDTO[] = [
                {
                    id: '1',
                    item_name: 'Raqueta',
                    status: 'Loaned',
                    loan_date: '2026-05-01',
                    due_date: '2026-05-15',
                    member_id: 'uuid-member-1',
                },
                {
                    id: '2',
                    item_name: 'Pelota',
                    status: 'Returned',
                    loan_date: '2026-04-01',
                    due_date: '2026-04-15',
                    member_id: 'uuid-member-2',
                },
            ];
            vi.mocked(mockGetUseCase.execute).mockResolvedValueOnce(mockLoans);

            await controller.getAll(getReq, asReply);

            expect(mockReply.status).toHaveBeenCalledWith(200);
            expect(mockReply.send).toHaveBeenCalledWith({ data: mockLoans });
        });

        it('debe devolver status 500 si falla el caso de uso', async () => {
            vi.mocked(mockGetUseCase.execute).mockRejectedValueOnce(new Error('DB Falló'));

            await controller.getAll(getReq, asReply);

            expect(mockReply.status).toHaveBeenCalledWith(500);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'DB Falló' });
        });
    });

    describe('delete', () => {
        it('debe devolver status 204 si la eliminación es exitosa', async () => {
            vi.mocked(mockDeleteUseCase.execute).mockResolvedValueOnce(undefined);

            await controller.delete(deleteReq, asReply);

            expect(mockDeleteUseCase.execute).toHaveBeenCalledWith('uuid-loan-1');
            expect(mockReply.status).toHaveBeenCalledWith(204);
            expect(mockReply.send).toHaveBeenCalledWith();
        });

        it('debe devolver status 404 si el préstamo de equipamiento no existe', async () => {
            vi.mocked(mockDeleteUseCase.execute).mockRejectedValueOnce(
                new Error('El préstamo de equipamiento no existe'),
            );

            await controller.delete(deleteReq, asReply);

            expect(mockReply.status).toHaveBeenCalledWith(404);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'El préstamo de equipamiento no existe' });
        });

        it('debe devolver status 500 ante un error genérico (ej: error de BD)', async () => {
            vi.mocked(mockDeleteUseCase.execute).mockRejectedValueOnce(new Error('Generic failure'));

            await controller.delete(deleteReq, asReply);

            expect(mockReply.status).toHaveBeenCalledWith(500);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'Generic failure' });
        });
    });
});
