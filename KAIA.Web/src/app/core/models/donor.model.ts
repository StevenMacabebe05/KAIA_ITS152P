export type DonorType = 'Individual' | 'Organization';

export interface Donor {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  type: DonorType;
  createdAtUtc: string;
}

export interface CreateDonor {
  name: string;
  email: string | null;
  phone: string | null;
  type: DonorType;
}

export interface UpdateDonor {
  name: string;
  email: string | null;
  phone: string | null;
  type: DonorType;
}