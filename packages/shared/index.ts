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
