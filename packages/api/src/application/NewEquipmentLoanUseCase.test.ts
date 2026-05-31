import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateEquipmentLoanUseCase } from './NewEquipmentLoanUseCase.js';
import { EquipmentLoanRepository } from '../domain/EquipmentLoanRepository.js';
import { EquipmentLoanValidator } from '../domain/services/EquipmentLoanValidator.js';
import { CreateEquipmentLoanRequest } from '@alentapp/shared';

describe('CreateEquipmentLoanUseCase', () => {
    // 1. Creamos Mocks tipados de nuestras dependencias (Puertos y Servicios).
    //    Implementamos la interfaz completa del repositorio y un Pick del validador (clase)
    //    para que TypeScript valide la forma de los mocks contra los tipos reales.
    const mockEquipmentLoanRepo: EquipmentLoanRepository = {
        create: vi.fn(),
        findById: vi.fn(),
        update: vi.fn(),
        findAll: vi.fn(),
        delete: vi.fn(),
    };

    type EquipmentLoanValidatorMock = Pick<
        EquipmentLoanValidator,
        'validateDateFormat' | 'validateLoanDates' | 'validateMemberCanBorrow'
    >;

    const mockEquipmentLoanValidator: EquipmentLoanValidatorMock = {
        validateDateFormat: vi.fn(),
        validateLoanDates: vi.fn(),
        validateMemberCanBorrow: vi.fn(),
    };

    // 2. Instanciamos el caso de uso inyectando los mocks
    const useCase = new CreateEquipmentLoanUseCase(
        mockEquipmentLoanRepo,
        mockEquipmentLoanValidator as EquipmentLoanValidator,
    );

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe crear un préstamo exitosamente con estado Loaned por defecto si pasa todas las validaciones', async () => {
        const mockRequest: CreateEquipmentLoanRequest = {
            item_name: 'Raqueta de tenis',
            loan_date: '2026-05-01',
            due_date: '2026-05-15',
            member_id: 'uuid-member-1',
        };

        vi.mocked(mockEquipmentLoanRepo.create).mockResolvedValueOnce({
            id: 'uuid-loan-1',
            ...mockRequest,
            status: 'Loaned',
        });

        const result = await useCase.execute(mockRequest);

        // Verificamos que se hayan llamado las validaciones de negocio
        expect(mockEquipmentLoanValidator.validateDateFormat).toHaveBeenCalledWith(mockRequest.loan_date);
        expect(mockEquipmentLoanValidator.validateDateFormat).toHaveBeenCalledWith(mockRequest.due_date);
        expect(mockEquipmentLoanValidator.validateLoanDates).toHaveBeenCalledWith(
            mockRequest.loan_date,
            mockRequest.due_date,
        );
        expect(mockEquipmentLoanValidator.validateMemberCanBorrow).toHaveBeenCalledWith(mockRequest.member_id);

        // Verificamos persistencia
        expect(mockEquipmentLoanRepo.create).toHaveBeenCalledWith(mockRequest);
        expect(result.id).toBe('uuid-loan-1');
        expect(result.status).toBe('Loaned');
    });

    it('debe propagar el error si el formato de fecha es inválido', async () => {
        const mockRequest: CreateEquipmentLoanRequest = {
            item_name: 'Raqueta',
            loan_date: 'fecha-invalida',
            due_date: '2026-05-15',
            member_id: 'uuid-member-1',
        };

        vi.mocked(mockEquipmentLoanValidator.validateDateFormat).mockImplementationOnce(() => {
            throw new Error('Formato de fecha inválido');
        });

        await expect(useCase.execute(mockRequest)).rejects.toThrow('Formato de fecha inválido');
        expect(mockEquipmentLoanRepo.create).not.toHaveBeenCalled();
    });

    it('debe propagar el error si la fecha de devolución es anterior a la del préstamo', async () => {
        const mockRequest: CreateEquipmentLoanRequest = {
            item_name: 'Raqueta',
            loan_date: '2026-05-15',
            due_date: '2026-05-01',
            member_id: 'uuid-member-1',
        };

        vi.mocked(mockEquipmentLoanValidator.validateLoanDates).mockImplementationOnce(() => {
            throw new Error('La fecha de devolución esperada debe ser mayor a la fecha del préstamo');
        });

        await expect(useCase.execute(mockRequest)).rejects.toThrow(
            'La fecha de devolución esperada debe ser mayor a la fecha del préstamo',
        );
        expect(mockEquipmentLoanRepo.create).not.toHaveBeenCalled();
    });

    it('debe propagar el error si el socio no existe', async () => {
        const mockRequest: CreateEquipmentLoanRequest = {
            item_name: 'Raqueta',
            loan_date: '2026-05-01',
            due_date: '2026-05-15',
            member_id: 'uuid-inexistente',
        };

        vi.mocked(mockEquipmentLoanValidator.validateMemberCanBorrow).mockRejectedValueOnce(
            new Error('El socio no existe'),
        );

        await expect(useCase.execute(mockRequest)).rejects.toThrow('El socio no existe');
        expect(mockEquipmentLoanRepo.create).not.toHaveBeenCalled();
    });

    it('debe propagar el error si la categoría del socio no le permite tomar prestamos', async () => {
        const mockRequest: CreateEquipmentLoanRequest = {
            item_name: 'Raqueta',
            loan_date: '2026-05-01',
            due_date: '2026-05-15',
            member_id: 'uuid-cadete',
        };

        vi.mocked(mockEquipmentLoanValidator.validateMemberCanBorrow).mockRejectedValueOnce(
            new Error('La categoría del socio no le permite tomar prestamos'),
        );

        await expect(useCase.execute(mockRequest)).rejects.toThrow(
            'La categoría del socio no le permite tomar prestamos',
        );
        expect(mockEquipmentLoanRepo.create).not.toHaveBeenCalled();
    });
});
