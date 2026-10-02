namespace KAIA.Shared.Dtos;

public record InventoryItemDto
{
    public int ItemId { get; init; }
    public string Name { get; init; } = string.Empty;
    public string Code { get; init; } = string.Empty;
    public string Brand { get; init; } = string.Empty;
    public decimal UnitPrice { get; init; }
    public int TotalIn { get; init; }
    public int TotalOut { get; init; }
    public int Stock { get; init; }
}