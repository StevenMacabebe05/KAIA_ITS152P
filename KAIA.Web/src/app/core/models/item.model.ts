/** Mirrors KAIA.Shared.Dtos.ItemDto — read model returned by GET /api/items */
export interface Item {
  id: number;
  name: string;
  code: string;
  brand: string;
  unitPrice: number;
  createdAtUtc: string;
  category: string;
  /** Optional — if set, shown instead of the colored tile. Ready for M3. */
  imageUrl?: string;
}

export interface CreateItem {
  name: string;
  code: string;
  brand: string;
  unitPrice: number;
}

export interface UpdateItem {
  name: string;
  code: string;
  brand: string;
  unitPrice: number;
}