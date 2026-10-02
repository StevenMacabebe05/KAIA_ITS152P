using KAIA.API.Data;
using KAIA.Shared.Dtos;
using Microsoft.EntityFrameworkCore;

namespace KAIA.API.Services;

public class InventoryService : IInventoryService
{
    private readonly KaiaDbContext _db;

    public InventoryService(KaiaDbContext db) => _db = db;

    public async Task<IReadOnlyList<InventoryItemDto>> GetAllAsync(CancellationToken ct = default)
    {
        var incoming = await _db.DonationLines
            .GroupBy(l => l.ItemId)
            .Select(g => new { ItemId = g.Key, Qty = g.Sum(l => l.Quantity) })
            .ToDictionaryAsync(x => x.ItemId, x => x.Qty, ct);

        var outgoing = await _db.DistributionLines
            .GroupBy(l => l.ItemId)
            .Select(g => new { ItemId = g.Key, Qty = g.Sum(l => l.Quantity) })
            .ToDictionaryAsync(x => x.ItemId, x => x.Qty, ct);

        var items = await _db.Items
            .AsNoTracking()
            .OrderBy(i => i.Name)
            .ToListAsync(ct);

        return items.Select(i =>
        {
            var inQty = incoming.GetValueOrDefault(i.Id, 0);
            var outQty = outgoing.GetValueOrDefault(i.Id, 0);
            return new InventoryItemDto
            {
                ItemId = i.Id,
                Name = i.Name,
                Code = i.Code,
                Brand = i.Brand,
                UnitPrice = i.UnitPrice,
                TotalIn = inQty,
                TotalOut = outQty,
                Stock = inQty - outQty
            };
        }).ToList();
    }

    public async Task<InventoryItemDto?> GetByItemIdAsync(int itemId, CancellationToken ct = default)
    {
        var item = await _db.Items
            .AsNoTracking()
            .FirstOrDefaultAsync(i => i.Id == itemId, ct);
        if (item is null) return null;

        var inQty = await _db.DonationLines
            .Where(l => l.ItemId == itemId)
            .SumAsync(l => (int?)l.Quantity, ct) ?? 0;

        var outQty = await _db.DistributionLines
            .Where(l => l.ItemId == itemId)
            .SumAsync(l => (int?)l.Quantity, ct) ?? 0;

        return new InventoryItemDto
        {
            ItemId = item.Id,
            Name = item.Name,
            Code = item.Code,
            Brand = item.Brand,
            UnitPrice = item.UnitPrice,
            TotalIn = inQty,
            TotalOut = outQty,
            Stock = inQty - outQty
        };
    }

    public async Task<Dictionary<int, int>> GetStockByItemIdsAsync(
        IEnumerable<int> itemIds,
        CancellationToken ct = default)
    {
        var ids = itemIds.Distinct().ToList();
        if (ids.Count == 0) return new Dictionary<int, int>();

        var incoming = await _db.DonationLines
            .Where(l => ids.Contains(l.ItemId))
            .GroupBy(l => l.ItemId)
            .Select(g => new { ItemId = g.Key, Qty = g.Sum(l => l.Quantity) })
            .ToDictionaryAsync(x => x.ItemId, x => x.Qty, ct);

        var outgoing = await _db.DistributionLines
            .Where(l => ids.Contains(l.ItemId))
            .GroupBy(l => l.ItemId)
            .Select(g => new { ItemId = g.Key, Qty = g.Sum(l => l.Quantity) })
            .ToDictionaryAsync(x => x.ItemId, x => x.Qty, ct);

        return ids.ToDictionary(
            id => id,
            id => incoming.GetValueOrDefault(id, 0) - outgoing.GetValueOrDefault(id, 0)
        );
    }
}