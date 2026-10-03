namespace KAIA.Shared.Dtos;

public record InventoryReportDto
{
    public int TotalItems { get; init; }
    public int ItemsInStock { get; init; }
    public int ItemsOutOfStock { get; init; }
    public int ItemsLowStock { get; init; }
    public int TotalStockUnits { get; init; }
    public decimal EstimatedStockValue { get; init; }

    public IReadOnlyList<InventoryItemDto> AllItems { get; init; } = Array.Empty<InventoryItemDto>();
    public IReadOnlyList<InventoryItemDto> LowStockItems { get; init; } = Array.Empty<InventoryItemDto>();
    public IReadOnlyList<InventoryItemDto> OutOfStockItems { get; init; } = Array.Empty<InventoryItemDto>();
}