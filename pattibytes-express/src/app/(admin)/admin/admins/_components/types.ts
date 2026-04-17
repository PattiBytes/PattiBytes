export type AdminRole = 'admin' | 'superadmin';

export interface AdminProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  role: AdminRole;
  avatar_url?: string | null;
  approval_status?: string | null;
  is_active?: boolean | null;
  city?: string | null;     // ← used as assigned branch city
  state?: string | null;    // ← used as assigned branch state
  username?: string | null; // ← used as branch code / slug
  created_at: string;
  updated_at?: string | null;
}

// Pre-defined branch options — extend as PattiBytes Express expands
export interface BranchOption {
  code: string;
  label: string;
  city: string;
  state: string;
}

export const BRANCHES: BranchOption[] = [
  { code: 'patti',       label: 'Patti (HQ)',      city: 'Patti',       state: 'Punjab' },
  { code: 'tarn-taran',  label: 'Tarn Taran',      city: 'Tarn Taran',  state: 'Punjab' },
  { code: 'amritsar',    label: 'Amritsar',        city: 'Amritsar',    state: 'Punjab' },
  { code: 'ludhiana',    label: 'Ludhiana',        city: 'Ludhiana',    state: 'Punjab' },
  { code: 'jalandhar',   label: 'Jalandhar',       city: 'Jalandhar',   state: 'Punjab' },
  { code: 'chandigarh',  label: 'Chandigarh',      city: 'Chandigarh',  state: 'Punjab' },
  { code: 'global',      label: '🌐 All Branches', city: '',            state: '' },
  { code: 'custom',      label: '✏️ Custom…',      city: '',            state: '' },
];