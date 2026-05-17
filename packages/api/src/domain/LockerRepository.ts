import { CreateLockerRequest, LockerDTO } from '@alentapp/shared';

// Puerto de salida para casilleros.
// El dominio no conoce si se persiste en Postgres u otra tecnología.

export interface LockerRepository {
  create(locker: CreateLockerRequest): Promise<LockerDTO>;
  findByNumber(number: number): Promise<LockerDTO | null>;
  findAll(): Promise<LockerDTO[]>;
}
