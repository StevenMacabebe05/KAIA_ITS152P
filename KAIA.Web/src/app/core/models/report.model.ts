import { InventoryItem } from './inventory.model';

// ─── Donations report ────────────────────────────────────────────────────
export interface CauseBreakdown {
  causeId: number;
  causeTitle: string;
  ngoName: string;
  donationCount: number;
  totalValue: number;
  percentOfTotal: number;
}

export interface DonorBreakdown {
  donorId: number;
  donorName: string;
  donorType: string;
  donationCount: number;
  totalValue: number;
}

export interface MonthlyTotal {
  month: string;
  monthLabel: string;
  count: number;
  totalValue: number;
}

export interface DonationReport {
  totalDonations: number;
  totalValue: number;
  averageValue: number;
  totalLineItems: number;
  byCause: CauseBreakdown[];
  byDonor: DonorBreakdown[];
  monthlyTrend: MonthlyTotal[];
}

// ─── Inventory report ────────────────────────────────────────────────────
export interface InventoryReport {
  totalItems: number;
  itemsInStock: number;
  itemsOutOfStock: number;
  itemsLowStock: number;
  totalStockUnits: number;
  estimatedStockValue: number;
  allItems: InventoryItem[];
  lowStockItems: InventoryItem[];
  outOfStockItems: InventoryItem[];
}

// ─── Distribution report ─────────────────────────────────────────────────
export interface DistributionCauseBreakdown {
  causeId: number;
  causeTitle: string;
  ngoName: string;
  distributionCount: number;
  totalQuantity: number;
}

export interface RecipientBreakdown {
  recipient: string;
  distributionCount: number;
  totalQuantity: number;
}

export interface MonthlyDistributionTotal {
  month: string;
  monthLabel: string;
  count: number;
  totalQuantity: number;
}

export interface DistributionReport {
  totalDistributions: number;
  totalQuantityDistributed: number;
  averageItemsPerDistribution: number;
  uniqueRecipients: number;
  byCause: DistributionCauseBreakdown[];
  topRecipients: RecipientBreakdown[];
  monthlyTrend: MonthlyDistributionTotal[];
}

// ─── Cause progress ──────────────────────────────────────────────────────
export interface CauseProgress {
  causeId: number;
  title: string;
  ngoName: string;
  status: string;
  goalAmount: number;
  raisedAmount: number;
  percentComplete: number;
  donationCount: number;
  distributionCount: number;
  deadline: string;
  daysRemaining: number;
}