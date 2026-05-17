import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client/client.js';
import { randomUUID } from 'crypto';
import { LockerRepository } from '../domain/LockerRepository.js';
import { CreateLockerRequest, LockerDTO, LockerStatus } from '@alentapp/shared';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
}

const prisma = new PrismaClient({
    adapter: new PrismaPg(process.env.DATABASE_URL),
});

type DBLocker = {
    id: string;
    number: number;
    location: string;
    status: LockerStatus;
    member_id: string | null;
};

export class PostgresLockerRepository implements LockerRepository {
    async create(data: CreateLockerRequest): Promise<LockerDTO> {
        const [locker] = await prisma.$queryRaw<DBLocker[]>`
            INSERT INTO "lockers" ("id", "number", "location", "status")
            VALUES (${randomUUID()}, ${data.number}, ${data.location}, 'Available'::"LockerStatus")
            RETURNING "id", "number", "location", "status", "member_id"
        `;

        return this.mapToDTO(locker);
    }

    async findByNumber(number: number): Promise<LockerDTO | null> {
        const [locker] = await prisma.$queryRaw<DBLocker[]>`
            SELECT "id", "number", "location", "status", "member_id"
            FROM "lockers"
            WHERE "number" = ${number}
            LIMIT 1
        `;

        return locker ? this.mapToDTO(locker) : null;
    }

    async findAll(): Promise<LockerDTO[]> {
        const lockers = await prisma.$queryRaw<DBLocker[]>`
            SELECT "id", "number", "location", "status", "member_id"
            FROM "lockers"
            ORDER BY "number" ASC
        `;

        return lockers.map((locker: DBLocker) => this.mapToDTO(locker));
    }

    private mapToDTO(locker: DBLocker): LockerDTO {
        return {
            id: locker.id,
            number: locker.number,
            location: locker.location,
            status: locker.status,
            member_id: locker.member_id,
        };
    }
}
