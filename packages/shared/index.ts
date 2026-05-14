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


