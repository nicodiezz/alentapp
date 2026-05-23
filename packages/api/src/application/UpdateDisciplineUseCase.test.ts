import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateDisciplineUseCase } from './UpdateDisciplineUseCase.js';
import { DisciplineRepository } from '../domain/DisciplineRepository.js';
import { DisciplineValidator } from '../domain/services/DisciplineValidator.js';
import { UpdateDisciplineRequest, DisciplineDTO } from '@alentapp/shared';
import { MemberRepository } from '../domain/MemberRepository.js';

describe('UpdateDisciplineUseCase', () => {
    const mockDisciplineRepo = {
        findById: vi.fn(),
        update: vi.fn(),
    } as unknown as DisciplineRepository;

    const mockDisciplineValidator = {
        validateDateFormat: vi.fn(),
        validateDates: vi.fn(),
    } as unknown as DisciplineValidator;

    const mockMemberRepo = {
        findById: vi.fn(),
    } as unknown as MemberRepository;

    const useCase = new UpdateDisciplineUseCase(mockDisciplineRepo, mockDisciplineValidator, mockMemberRepo);

    const mockExistingDiscipline: DisciplineDTO = {
        id: '1',
        reason: 'Pelea',
        issue_date: '2026-04-01',
        expiry_date: '2026-06-01',
        is_total_suspension: false,
        member_id: '1'
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(mockDisciplineRepo.findById).mockResolvedValue(mockExistingDiscipline);
    });

    it('debe lanzar error si la suspensión no existe', async () => {
        vi.mocked(mockDisciplineRepo.findById).mockResolvedValueOnce(null);
        await expect(useCase.execute('uuid-no', {})).rejects.toThrow('La suspensión no existe');
    });

    it('debe validar fechas y member_id si son enviados y distintos', async () => {
        const updateData: UpdateDisciplineRequest = { issue_date: '2026-06-11', expiry_date: '2026-07-21', member_id: '4' };
        vi.mocked(mockDisciplineRepo.update).mockResolvedValueOnce({ ...mockExistingDiscipline, ...updateData });
        vi.mocked(mockMemberRepo.findById).mockResolvedValueOnce({ id: '4' } as any);

        await useCase.execute('1', updateData);

        expect(mockDisciplineValidator.validateDateFormat).toHaveBeenCalledWith('2026-06-11');
        expect(mockDisciplineValidator.validateDateFormat).toHaveBeenCalledWith('2026-07-21');
        expect(mockDisciplineValidator.validateDates).toHaveBeenCalledWith('2026-06-11', '2026-07-21');
        expect(mockMemberRepo.findById).toHaveBeenCalledWith('4');
    });

    it('debe validar issue_date contra expiry_date existente si solo se envia issue_date', async () => {
        const updateData: UpdateDisciplineRequest = { issue_date: '2026-05-01' };
        vi.mocked(mockDisciplineRepo.update).mockResolvedValueOnce({ ...mockExistingDiscipline, ...updateData });

        await useCase.execute('1', updateData);

        expect(mockDisciplineValidator.validateDateFormat).toHaveBeenCalledWith('2026-05-01');
        expect(mockDisciplineValidator.validateDates).toHaveBeenCalledWith('2026-05-01', '2026-06-01');
    });

    it('debe validar expiry_date contra issue_date existente si solo se envia expiry_date', async () => {
        const updateData: UpdateDisciplineRequest = { expiry_date: '2026-05-01' };
        vi.mocked(mockDisciplineRepo.update).mockResolvedValueOnce({ ...mockExistingDiscipline, ...updateData });

        await useCase.execute('1', updateData);

        expect(mockDisciplineValidator.validateDateFormat).toHaveBeenCalledWith('2026-05-01');
        expect(mockDisciplineValidator.validateDates).toHaveBeenCalledWith('2026-04-01', '2026-05-01');
    });

    it('debe lanzar error si el nuevo member_id no pertenece a un miembro existente', async () => {
        const updateData: UpdateDisciplineRequest = { member_id: '999' };
        vi.mocked(mockMemberRepo.findById).mockResolvedValueOnce(null);

        await expect(useCase.execute('1', updateData)).rejects.toThrow('El miembro indicado no existe');
        expect(mockDisciplineRepo.update).not.toHaveBeenCalled();
    });

    it('debe lanzar error si una fecha tiene formato inválido', async () => {
        const updateData: UpdateDisciplineRequest = { issue_date: '2026-4-01' };
        vi.mocked(mockDisciplineValidator.validateDateFormat).mockImplementationOnce(() => {
            throw new Error('Formato de fecha inválido');
        });

        await expect(useCase.execute('1', updateData)).rejects.toThrow('Formato de fecha inválido');
        expect(mockDisciplineRepo.update).not.toHaveBeenCalled();
    });

    it('debe lanzar error si la fecha de fin es anterior o igual a la de inicio', async () => {
        const updateData: UpdateDisciplineRequest = { issue_date: '2026-08-01', expiry_date: '2026-06-01' };
        vi.mocked(mockDisciplineValidator.validateDates).mockImplementationOnce(() => {
            throw new Error('La fecha de fin de suspensión no puede ser previa o igual a la fecha de inicio');
        });

        await expect(useCase.execute('1', updateData)).rejects.toThrow('La fecha de fin de suspensión no puede ser previa o igual a la fecha de inicio');
        expect(mockDisciplineRepo.update).not.toHaveBeenCalled();
    });

    it('NO debe validar member_id si es enviado pero es igual al original', async () => {
        const updateData: UpdateDisciplineRequest = { member_id: '1' };
        vi.mocked(mockDisciplineRepo.update).mockResolvedValueOnce({ ...mockExistingDiscipline });
        
        await useCase.execute('uuid-1', updateData);
        
        expect(mockMemberRepo.findById).not.toHaveBeenCalled();
    });
});
