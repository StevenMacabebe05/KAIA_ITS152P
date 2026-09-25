/** Mirrors KAIA.Shared.Dtos.ItemDto — read model returned by GET /api/items */
export interface Item {
  id: number;
  name: string;
  code: string;
  brand: string;
  unitPrice: number;
  createdAtUtc: string;
  category: string;
}

/** Mirrors KAIA.Shared.Dtos.CreateItemDto — payload for POST /api/items */
export interface CreateItem {
  name: string;
  code: string;
  brand: string;
  unitPrice: number;
}

/** Mirrors KAIA.Shared.Dtos.UpdateItemDto — payload for PUT /api/items/{id} */
export interface UpdateItem {
  name: string;
  code: string;
  brand: string;
  unitPrice: number;
}