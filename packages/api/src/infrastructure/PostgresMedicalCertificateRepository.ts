import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client/client.js';
import { MedicalCertificateRepository } from '../domain/MedicalCertificateRepository.js';
import { MedicalCertificateDTO, CreateMedicalCertificateRequest } from '@alentapp/shared';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
}

const prisma = new PrismaClient({
    adapter: new PrismaPg(process.env.DATABASE_URL),
});

type DBMedicalCertificate = {
    id: string;
    issue_date: Date;
    expiry_date: Date;
    doctor_license: string;
    is_validated: boolean;
    member_id: string;
};

export class PostgresMedicalCertificateRepository implements MedicalCertificateRepository {

    async create(data: CreateMedicalCertificateRequest): Promise<MedicalCertificateDTO> {
        const certificate = await prisma.medicalCertificate.create({
            data: {
                issue_date: new Date(data.issue_date),
                expiry_date: new Date(data.expiry_date),
                doctor_license: data.doctor_license,
                member_id: data.member_id,
                //prisma setea is_validated en false automaticamente (definido en schema)
            },
        });

        return this.mapToDTO(certificate);
    }

    async findActiveByMemberId(memberId: string): Promise<MedicalCertificateDTO | null> {
        const certificate = await prisma.medicalCertificate.findFirst({
            where: {
                member_id: memberId,
                is_validated: true,
            },
            orderBy: {
                issue_date: 'desc',
            },
        });

        return certificate ? this.mapToDTO(certificate) : null;
    }

    async invalidateById(id: string): Promise<void> {
        await prisma.medicalCertificate.update({
            where: { id },
            data: {
                is_validated: false,
            },
        });
    }

    private mapToDTO(cert: DBMedicalCertificate): MedicalCertificateDTO {
        return {
            id: cert.id,
            issue_date: cert.issue_date.toISOString().split('T')[0],
            expiry_date: cert.expiry_date.toISOString().split('T')[0],
            doctor_license: cert.doctor_license,
            is_validated: cert.is_validated,
            member_id: cert.member_id,
        };
    }
}