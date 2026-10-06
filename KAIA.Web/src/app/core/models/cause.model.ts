// core/models/cause.model.ts

export type CauseStatus = 'Active' | 'Completed' | 'Cancelled';

export interface Cause {
  id: number;
  ngoId: number;
  ngoName: string;
  title: string;
  description: string | null;
  goalAmount: number;
  raisedAmount: number;   // ← NEW: sum of donation TotalValue, sent by the API
  deadline: string;       // ISO date
  status: CauseStatus;
  createdAtUtc: string;
}

export interface CreateCause {
  ngoId: number;
  title: string;
  description: string | null;
  goalAmount: number;
  deadline: string;
}

export interface UpdateCause {
  ngoId: number;
  title: string;
  description: string | null;
  goalAmount: number;
  deadline: string;
  status: CauseStatus;
}

/** Option shape for NGO dropdowns. */
export interface NgoOption {
  id: number;
  name: string;
}