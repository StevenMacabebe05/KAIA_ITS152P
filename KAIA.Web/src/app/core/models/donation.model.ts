export interface DonationLine {
  id: number;
  itemId: number;
  itemName: string;
  itemCode: string;
  quantity: number;
  unitPriceAtTimeOfDonation: number;
  subtotal: number;
}

export interface Donation {
  id: number;
  donorId: number;
  donorName: string;
  causeId: number;
  causeTitle: string;
  ngoName: string;
  donatedAtUtc: string;
  notes: string | null;
  totalValue: number;
  lines: DonationLine[];
}

export interface CreateDonationLine {
  itemId: number;
  quantity: number;
}

export interface CreateDonation {
  donorId: number;
  causeId: number;
  donatedAtUtc: string;
  notes: string | null;
  lines: CreateDonationLine[];
}

export interface UpdateDonation {
  donorId: number;
  causeId: number;
  donatedAtUtc: string;
  notes: string | null;
  lines: CreateDonationLine[];
}