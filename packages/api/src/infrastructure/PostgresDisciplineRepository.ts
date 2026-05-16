import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client/client.js';
import { DisciplineRepository } from '../domain/DisciplineRepository.js';
import { DisciplineDTO, CreateDisciplineRequest, UpdateDisciplineRequest } from '@alentapp/shared';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
}

const prisma = new PrismaClient({
    adapter: new PrismaPg(process.env.DATABASE_URL),
});

type DBDiscipline = {
    id: string;
    reason: string;
    issue_date: Date | null;
    expiry_date: Date | null;
    is_total_suspension: boolean;
    member_id: string;
};

export class PostgresDisciplineRepository implements DisciplineRepository {
    async create(data: CreateDisciplineRequest): Promise<DisciplineDTO> {
        const discipline = await prisma.discipline.create({
            data: {
                reason: data.reason,
                issue_date: new Date(data.issue_date),
                expiry_date: new Date(data.expiry_date),
                is_total_suspension: data.is_total_suspension,
                member_id: data.member_id,
            },
        });

        return this.mapToDTO(discipline);
    }

    async findById(id: string): Promise<DisciplineDTO | null> {
        const discipline = await prisma.discipline.findUnique({
            where: { id },
        });

        return discipline ? this.mapToDTO(discipline) : null;
    }

    async findAll(): Promise<DisciplineDTO[]> {
        const disciplines = await prisma.discipline.findMany({
            orderBy: { created_at: 'desc' },
        });

        return disciplines.map(this.mapToDTO);
    }

    async update(id: string, data: UpdateDisciplineRequest): Promise<DisciplineDTO> {
        const discipline = await prisma.discipline.update({
            where: { id },
            data: {
                ...(data.reason !== undefined && { reason: data.reason }),
                ...(data.issue_date !== undefined && { issue_date: new Date(data.issue_date) }),
                ...(data.expiry_date !== undefined && { expiry_date: new Date(data.expiry_date) }),
                ...(data.is_total_suspension !== undefined && { is_total_suspension: data.is_total_suspension }),
                ...(data.member_id !== undefined && { member_id: data.member_id }),
            },
        });

        return this.mapToDTO(discipline);
    }

    async delete(id: string): Promise<void> {
        await prisma.discipline.delete({
            where: { id },
        });
    }

    private mapToDTO(discipline: DBDiscipline): DisciplineDTO {
        return {
            id: discipline.id,
            reason: discipline.reason,
            issue_date: discipline.issue_date ? discipline.issue_date.toISOString().split('T')[0] : '', // Extract YYYY-MM-DD
            expiry_date: discipline.expiry_date ? discipline.expiry_date.toISOString().split('T')[0] : '', // Extract YYYY-MM-DD
            is_total_suspension: discipline.is_total_suspension,
            member_id: discipline.member_id,
        };
    }
}
