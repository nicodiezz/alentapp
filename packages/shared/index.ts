// ==========================================
// Member
// ==========================================
export type MemberCategory = 'Pleno' | 'Cadete' | 'Honorario';
export type MemberStatus = 'Activo' | 'Moroso' | 'Suspendido';

export interface MemberDTO {
  id: string; // UUID
  dni: string;
  name: string;
  email: string;
  birthdate: string; // ISO Date String (YYYY-MM-DD)
  category: MemberCategory;
  status: MemberStatus;
  created_at: string; // ISO Date String
}

export interface CreateMemberRequest {
  dni: string;
  name: string;
  email: string;
  birthdate: string; // ISO Date String (YYYY-MM-DD)
  category: MemberCategory;
}

export interface UpdateMemberRequest {
  dni?: string;
  name?: string;
  email?: string;
  birthdate?: string; // ISO Date String (YYYY-MM-DD)
  category?: MemberCategory;
  status?: MemberStatus;
}

// ==========================================
// Payment
// ==========================================

export type PaymentStatus = 'Pending' | 'Paid' | 'Canceled';
export type CreatePaymentStatus = 'Pending' | 'Paid';

export interface PaymentDTO {
    id: string;
    member_id: string;
    amount: number;
    month: number;
    year: number;
    status: PaymentStatus;
    due_date: string; 
    payment_date?: string;
    created_at: string;
}

export interface CreatePaymentRequest {
    member_id: string;
    amount: number;
    month: number;
    year: number;
    status: CreatePaymentStatus;
    due_date: string;
    payment_date?: string;
}


// MedicalCertificate
// ==========================================

export interface MedicalCertificateDTO {
  id: string;
  issue_date: string; // ISO Date String (YYYY-MM-DD)
  expiry_date: string; // ISO Date String (YYYY-MM-DD)
  doctor_license: string;
  is_validated: boolean;
  member_id: string;
}

export interface CreateMedicalCertificateRequest {
  issue_date: string;
  expiry_date: string;
  doctor_license: string;
  member_id: string;
}

export interface UpdateMedicalCertificateRequest {
  issue_date?: string;
  expiry_date?: string;
  doctor_license?: string;
  is_validated?: boolean;
}

// ==========================================
// Discipline
// ==========================================

export interface DisciplineDTO {
  id: string; // UUID
  reason: string;
  issue_date: string; // ISO Date String (YYYY-MM-DD)
  expiry_date: string; // ISO Date String (YYYY-MM-DD)
  is_total_suspension: boolean;
  member_id: string;
}

export interface CreateDisciplineRequest {
  reason: string;
  issue_date: string; // ISO Date String (YYYY-MM-DD)
  expiry_date: string; // ISO Date String (YYYY-MM-DD)
  is_total_suspension: boolean;
  member_id: string;
}

export interface UpdateDisciplineRequest {
  reason?: string;
  issue_date?: string; // ISO Date String (YYYY-MM-DD)
  expiry_date?: string; // ISO Date String (YYYY-MM-DD)
  is_total_suspension?: boolean;
  member_id?: string;
}

// ==========================================
// Sport
// ==========================================
export interface SportDTO {
  id: string; // UUID
  name: string;
  description: string;
  max_capacity: number;
  additional_price: number;
  requires_medical_certificate: boolean;
}

export interface CreateSportRequest {
  name: string;
  description: string;
  max_capacity: number;
  additional_price: number;
  requires_medical_certificate: boolean;
}

export interface UpdateSportRequest {
  description?: string;
  max_capacity?: number;
}
// ==========================================
// Equipment Loan
// ==========================================

export type EquipmentLoanStatus = 'Loaned' | 'Returned' | 'Damaged'
export interface EquipmentLoanDTO {
  id: string; // UUID
  item_name: string;
  status: EquipmentLoanDTO;
  loan_date: string; // ISO Date String (YYYY-MM-DD)
  due_date: string; // ISO Date String (YYYY-MM-DD)
  member_id: string;
}


export interface CreateEquipmentLoanRequest {
  item_name: string;
  loan_date: string; // ISO Date String (YYYY-MM-DD)
  due_date: string; // ISO Date String (YYYY-MM-DD)
  member_id: string;
}
