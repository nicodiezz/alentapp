import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateDisciplineUseCase } from './NewDisciplineUseCase.js';
import { DisciplineRepository } from '../domain/DisciplineRepository.js';
import { DisciplineValidator } from '../domain/services/DisciplineValidator.js';
import { CreateDisciplineRequest } from '@alentapp/shared';

describe('CreateDisciplineUseCase', () => {
    // 1. Creamos Mocks de nuestras dependencias (Puertos y Servicios)
    const mockDisciplineRepo = {
        create: vi.fn(),
    } as unknown as DisciplineRepository;

    const mockDisciplineValidator = {
        validateDateFormat: vi.fn(),
        validateDates: vi.fn(),
        validateMemberExists: vi.fn(),
    } as unknown as DisciplineValidator;

    // 2. Instanciamos el caso de uso inyectando los mocks
    const useCase = new CreateDisciplineUseCase(mockDisciplineRepo, mockDisciplineValidator);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe crear una suspensión exitosamente si pasa validaciones', async () => {
        const mockRequest: CreateDisciplineRequest = {
            reason: 'Pelea',
            issue_date: '2026-04-01',
            expiry_date: '2026-06-01',
            is_total_suspension: false,
            member_id: 'uuid-1'
        };
        
        // Simulamos la respuesta de la base de datos
        vi.mocked(mockDisciplineRepo.create).mockResolvedValueOnce({
            id: 'uuid-3',
            ...mockRequest});

        const result = await useCase.execute(mockRequest);

        // Verificamos que se hayan llamado las validaciones de negocio
        expect(mockDisciplineValidator.validateDateFormat).toHaveBeenCalledWith(mockRequest.issue_date);
        expect(mockDisciplineValidator.validateDateFormat).toHaveBeenCalledWith(mockRequest.expiry_date);
        expect(mockDisciplineValidator.validateDates).toHaveBeenCalledWith(mockRequest.issue_date, mockRequest.expiry_date);
        expect(mockDisciplineValidator.validateMemberExists).toHaveBeenCalledWith(mockRequest.member_id);
        
        // Verificamos que se haya intentado persistir con los datos originales
        expect(mockDisciplineRepo.create).toHaveBeenCalledWith(mockRequest);

        expect(result.id).toBe('uuid-3');
    });

    it('debe lanzar error y no crear la suspensión si la fecha de inicio es posterior a la fecha de fin', async () => {
        const mockRequest: CreateDisciplineRequest = {
            reason: 'Pelea',
            issue_date: '2026-06-01',
            expiry_date: '2026-04-01',
            is_total_suspension: false,
            member_id: 'uuid-1',
        };
        
        
        vi.mocked(mockDisciplineValidator.validateDates).mockImplementationOnce(() => {
            throw new Error('La fecha de fin de suspensión no puede ser previa a la fecha de inicio');
        });
        
        await expect(useCase.execute(mockRequest)).rejects.toThrow(
            'La fecha de fin de suspensión no puede ser previa a la fecha de inicio',
        );
        
        expect(mockDisciplineValidator.validateDateFormat).toHaveBeenCalledWith(mockRequest.issue_date);
        expect(mockDisciplineValidator.validateDateFormat).toHaveBeenCalledWith(mockRequest.expiry_date);
        expect(mockDisciplineValidator.validateDates).toHaveBeenCalledWith(mockRequest.issue_date, mockRequest.expiry_date);
        expect(mockDisciplineValidator.validateMemberExists).not.toHaveBeenCalled();
        expect(mockDisciplineRepo.create).not.toHaveBeenCalled();
    });
    
    it('debe lanzar error y no crear la suspensión si member_id no pertenece a un miembro existente', async () => {
        const mockRequest: CreateDisciplineRequest = {
            reason: 'Pelea',
            issue_date: '2026-04-01',
            expiry_date: '2026-06-01',
            is_total_suspension: false,
            member_id: 'uuid-999',
        };
    
        vi.mocked(mockDisciplineValidator.validateMemberExists).mockRejectedValueOnce(
            new Error('El miembro indicado no existe'),
        );
    
        await expect(useCase.execute(mockRequest)).rejects.toThrow('El miembro indicado no existe');

        expect(mockDisciplineValidator.validateDateFormat).toHaveBeenCalledWith(mockRequest.issue_date);
        expect(mockDisciplineValidator.validateDateFormat).toHaveBeenCalledWith(mockRequest.expiry_date);
        expect(mockDisciplineValidator.validateDates).toHaveBeenCalledWith(mockRequest.issue_date, mockRequest.expiry_date);
        expect(mockDisciplineValidator.validateMemberExists).toHaveBeenCalledWith(mockRequest.member_id);
        expect(mockDisciplineRepo.create).not.toHaveBeenCalled();
    });

    it('debe lanzar error y no crear la suspensión si una fecha tiene formato inválido', async () => {
        const mockRequest: CreateDisciplineRequest = {
            reason: 'Pelea',
            issue_date: '2026-4-01',
            expiry_date: '2026-06-01',
            is_total_suspension: false,
            member_id: 'uuid-1',
        };

        vi.mocked(mockDisciplineValidator.validateDateFormat).mockImplementationOnce(() => {
            throw new Error('Formato de fecha inválido');
        });

        await expect(useCase.execute(mockRequest)).rejects.toThrow('Formato de fecha inválido');

        expect(mockDisciplineValidator.validateDateFormat).toHaveBeenCalledWith(mockRequest.issue_date);
        expect(mockDisciplineValidator.validateDates).not.toHaveBeenCalled();
        expect(mockDisciplineValidator.validateMemberExists).not.toHaveBeenCalled();
        expect(mockDisciplineRepo.create).not.toHaveBeenCalled();
    });
});
