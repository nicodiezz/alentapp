import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateLockerUseCase } from './UpdateLockerUseCase.js';
import { LockerRepository } from '../domain/LockerRepository.js';
import { LockerValidator } from '../domain/services/LockerValidator.js';
import { MemberRepository } from '../domain/MemberRepository.js';
import { LockerDTO, UpdateLockerRequest } from '@alentapp/shared';

describe('UpdateLockerUseCase', () => {
    const mockLockerRepo: LockerRepository = {
        create: vi.fn(),
        findAll: vi.fn(),
        findById: vi.fn(),
        findByNumber: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    };

    const mockMemberRepo = {
        findById: vi.fn(),
        findAll: vi.fn(),
        findByDni: vi.fn(),
        findByEmail: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    } as unknown as MemberRepository;

    const mockLockerValidator = new LockerValidator(mockLockerRepo);
    const validateUpdateSpy = vi.spyOn(mockLockerValidator, 'validateUpdate');

    const useCase = new UpdateLockerUseCase(mockLockerRepo, mockLockerValidator, mockMemberRepo);

    const existingLocker: LockerDTO = {
        id: 'locker-1',
        number: 10,
        location: 'Vestuario A',
        status: 'Available',
        member_id: null,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        validateUpdateSpy.mockResolvedValue(undefined);
        vi.mocked(mockLockerRepo.findById).mockResolvedValue(existingLocker);
    });

    it('debe actualizar el casillero exitosamente', async () => {
        const updateData: UpdateLockerRequest = { location: 'Vestuario B' };

        vi.mocked(mockLockerRepo.update).mockResolvedValueOnce({
            ...existingLocker,
            location: 'Vestuario B',
        });

        const result = await useCase.execute('locker-1', updateData);

        expect(mockLockerRepo.findById).toHaveBeenCalledWith('locker-1');
        expect(mockLockerValidator.validateUpdate).toHaveBeenCalledWith('locker-1', updateData);
        expect(mockLockerRepo.update).toHaveBeenCalledWith('locker-1', updateData);
        expect(result.location).toBe('Vestuario B');
    });

    it('debe lanzar error si el casillero no existe', async () => {
        vi.mocked(mockLockerRepo.findById).mockResolvedValueOnce(null);

        await expect(useCase.execute('locker-999', { location: 'Nueva ubicación' })).rejects.toThrow(
            'El casillero no existe',
        );
        expect(mockLockerRepo.update).not.toHaveBeenCalled();
    });

    it('debe lanzar error si el miembro indicado no existe', async () => {
        vi.mocked(mockMemberRepo.findById).mockResolvedValueOnce(null);

        await expect(
            useCase.execute('locker-1', { member_id: 'member-999' }),
        ).rejects.toThrow('El miembro indicado no existe');
        expect(mockLockerRepo.update).not.toHaveBeenCalled();
    });

    it('debe lanzar error al asignar miembro a casillero en mantenimiento', async () => {
        const maintenanceLocker: LockerDTO = {
            ...existingLocker,
            status: 'Maintenance',
            member_id: null,
        };
        vi.mocked(mockLockerRepo.findById).mockResolvedValueOnce(maintenanceLocker);
        vi.mocked(mockMemberRepo.findById).mockResolvedValueOnce({
            id: 'member-1',
            name: 'Socio Test',
            dni: '12345678',
            email: 'socio@test.com',
            birthdate: '1990-01-01',
            category: 'Pleno',
            status: 'Activo',
            created_at: new Date().toISOString(),
        });

        await expect(
            useCase.execute('locker-1', { member_id: 'member-1' }),
        ).rejects.toThrow('No se puede asignar un casillero en mantenimiento');
        expect(mockLockerRepo.update).not.toHaveBeenCalled();
    });

    it('no debe consultar memberRepo si el member_id no cambia', async () => {
        const lockerWithMember: LockerDTO = {
            ...existingLocker,
            status: 'Occupied',
            member_id: 'member-1',
        };
        vi.mocked(mockLockerRepo.findById).mockResolvedValueOnce(lockerWithMember);
        vi.mocked(mockLockerRepo.update).mockResolvedValueOnce({ ...lockerWithMember, location: 'Vestuario C' });

        await useCase.execute('locker-1', { location: 'Vestuario C', member_id: 'member-1' });

        expect(mockMemberRepo.findById).not.toHaveBeenCalled();
    });
});
