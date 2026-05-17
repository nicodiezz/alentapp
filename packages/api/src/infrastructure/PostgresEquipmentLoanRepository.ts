import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client/client.js';
import { EquipmentLoanRepository } from '../domain/EquipmentLoanRepository.js';
import { EquipmentLoanDTO, CreateEquipmentLoanRequest, UpdateEquipmentLoanRequest } from '@alentapp/shared';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
}

const prisma = new PrismaClient({
    adapter: new PrismaPg(process.env.DATABASE_URL),
});

type DBEquipmentLoan = {
    id: string;
    item_name: string;
    status: 'Loaned' | 'Returned' | 'Damaged';
    loan_date: Date | null;
    due_date: Date | null;
    member_id: string;
};

export class PostgresEquipmentLoanRepository implements EquipmentLoanRepository {
    async create(data: CreateEquipmentLoanRequest): Promise<EquipmentLoanDTO> {
        const equipmentLoan = await prisma.equipmentLoan.create({
            data: {
                item_name: data.item_name,
                status: 'Loaned',
                loan_date: new Date(data.loan_date),
                due_date: new Date(data.due_date),
                member_id: data.member_id,
            },
        });

        return this.mapToDTO(equipmentLoan);
    }

    async findById(id: string): Promise<EquipmentLoanDTO | null> {
        const equipmentLoan = await prisma.equipmentLoan.findUnique({
            where: { id },
        });

        return equipmentLoan ? this.mapToDTO(equipmentLoan) : null;
    }

    async update(id: string, data: UpdateEquipmentLoanRequest): Promise<EquipmentLoanDTO> {
        const equipmentLoan = await prisma.equipmentLoan.update({
            where: { id },
            data: {
                ...(data.item_name !== undefined && { item_name: data.item_name }),
                ...(data.status !== undefined && { status: data.status }),
                ...(data.loan_date !== undefined && { loan_date: new Date(data.loan_date) }),
                ...(data.due_date !== undefined && { due_date: new Date(data.due_date) }),
                ...(data.member_id !== undefined && { member_id: data.member_id }),
            },
        });

        return this.mapToDTO(equipmentLoan);
    }

    async findAll(): Promise<EquipmentLoanDTO[]> {
        const loans = await prisma.equipmentLoan.findMany({
            orderBy: { loan_date: 'desc' },
        });
        return loans.map(this.mapToDTO);
    }

    private mapToDTO(equipmentLoan: DBEquipmentLoan): EquipmentLoanDTO {
        return {
            id: equipmentLoan.id,
            item_name: equipmentLoan.item_name,
            status: equipmentLoan.status,
            loan_date: equipmentLoan.loan_date ? equipmentLoan.loan_date.toISOString().split('T')[0] : '',
            due_date: equipmentLoan.due_date ? equipmentLoan.due_date.toISOString().split('T')[0] : '',
            member_id: equipmentLoan.member_id,
        };
    }
}
