import { SportDTO, CreateSportRequest, UpdateSportRequest } from '@alentapp/shared';

// Esta interfaz es el "Puerto de Salida" para deportes.
// El dominio no conoce si se persiste en Postgres u otra tecnología.

export interface SportRepository {
  create(sport: CreateSportRequest): Promise<SportDTO>;
  findById(id: string): Promise<SportDTO | null>;
  findByName(name: string): Promise<SportDTO | null>;
  findAll(): Promise<SportDTO[]>;
  update(id: string, data: UpdateSportRequest): Promise<SportDTO>;
}
