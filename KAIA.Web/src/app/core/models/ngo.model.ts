export type NgoVerificationStatus = 'Pending' | 'Verified' | 'Rejected';

export interface Ngo {
  id: number;
  name: string;
  description: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  website: string | null;
  verificationStatus: NgoVerificationStatus;
  createdAtUtc: string;
}

export interface CreateNgo {
  name: string;
  description: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  website: string | null;
}

export interface UpdateNgo {
  name: string;
  description: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  website: string | null;
}

export interface UpdateNgoVerification {
  verificationStatus: NgoVerificationStatus;
}