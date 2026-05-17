import { CreateEquipmentLoanRequest, EquipmentLoanDTO } from '@alentapp/shared';

export interface EquipmentLoanRepository {
  create(equipmentLoan: CreateEquipmentLoanRequest): Promise<EquipmentLoanDTO>;
}
