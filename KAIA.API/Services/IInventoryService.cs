using KAIA.Shared.Dtos;

namespace KAIA.API.Services;

public interface IInventoryService
{
    Task<IReadOnlyList<InventoryItemDto>> GetAllAsync(CancellationToken ct = default);
    Task<InventoryItemDto?> GetByItemIdAsync(int itemId, CancellationToken ct = default);
    Task<Dictionary<int, int>> GetStockByItemIdsAsync(IEnumerable<int> itemIds, CancellationToken ct = default);
}