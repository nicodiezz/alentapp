import { CreateEquipmentLoanRequest, UpdateEquipmentLoanRequest, EquipmentLoanDTO } from '@alentapp/shared';

export interface EquipmentLoanRepository {
  create(equipmentLoan: CreateEquipmentLoanRequest): Promise<EquipmentLoanDTO>;
  findById(id: string): Promise<EquipmentLoanDTO | null>;
  update(id: string, data: UpdateEquipmentLoanRequest): Promise<EquipmentLoanDTO>;
  findAll(): Promise<EquipmentLoanDTO[]>;
}
