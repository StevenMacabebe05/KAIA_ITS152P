export interface DistributionLine {
  id: number;
  itemId: number;
  itemName: string;
  itemCode: string;
  quantity: number;
}

export interface Distribution {
  id: number;
  causeId: number;
  causeTitle: string;
  ngoName: string;
  distributedAtUtc: string;
  recipient: string;
  notes: string | null;
  lines: DistributionLine[];
}

export interface CreateDistributionLine {
  itemId: number;
  quantity: number;
}

export interface CreateDistribution {
  causeId: number;
  distributedAtUtc: string;
  recipient: string;
  notes: string | null;
  lines: CreateDistributionLine[];
}

export interface UpdateDistribution {
  causeId: number;
  distributedAtUtc: string;
  recipient: string;
  notes: string | null;
  lines: CreateDistributionLine[];
}