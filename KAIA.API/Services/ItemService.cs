using KAIA.API.Data;
using KAIA.API.Models;
using KAIA.Shared.Dtos;
using Microsoft.EntityFrameworkCore;

namespace KAIA.API.Services;

public class ItemService : IItemService
{
    private readonly KaiaDbContext _db;

    public ItemService(KaiaDbContext db) => _db = db;

    public async Task<IReadOnlyList<ItemDto>> GetAllAsync(CancellationToken ct = default)
    {
        return await _db.Items
            .AsNoTracking()
            .OrderByDescending(i => i.CreatedAtUtc)
            .Select(i => ToDto(i))
            .ToListAsync(ct);
    }

    public async Task<ItemDto?> GetByIdAsync(int id, CancellationToken ct = default)
    {
        var item = await _db.Items
            .AsNoTracking()
            .FirstOrDefaultAsync(i => i.Id == id, ct);

        return item is null ? null : ToDto(item);
    }

    public async Task<ItemDto> CreateAsync(CreateItemDto dto, CancellationToken ct = default)
    {
        var item = new Item
        {
            Name = dto.Name.Trim(),
            Code = dto.Code.Trim().ToUpperInvariant(),
            Brand = dto.Brand.Trim(),
            UnitPrice = dto.UnitPrice,
            CreatedAtUtc = DateTime.UtcNow
        };

        _db.Items.Add(item);
        await _db.SaveChangesAsync(ct);
        return ToDto(item);
    }

    public async Task<ItemDto?> UpdateAsync(int id, UpdateItemDto dto, CancellationToken ct = default)
    {
        var item = await _db.Items.FirstOrDefaultAsync(i => i.Id == id, ct);
        if (item is null) return null;

        item.Name = dto.Name.Trim();
        item.Code = dto.Code.Trim().ToUpperInvariant();
        item.Brand = dto.Brand.Trim();
        item.UnitPrice = dto.UnitPrice;

        await _db.SaveChangesAsync(ct);
        return ToDto(item);
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken ct = default)
    {
        var item = await _db.Items.FirstOrDefaultAsync(i => i.Id == id, ct);
        if (item is null) return false;

        _db.Items.Remove(item);
        await _db.SaveChangesAsync(ct);
        return true;
    }

    public Task<bool> CodeExistsAsync(string code, int? excludeId = null, CancellationToken ct = default)
    {
        var normalized = code.Trim().ToUpperInvariant();
        return _db.Items.AnyAsync(
            i => i.Code == normalized && (excludeId == null || i.Id != excludeId.Value),
            ct);
    }

    private static ItemDto ToDto(Item i) => new()
    {
        Id = i.Id,
        Name = i.Name,
        Code = i.Code,
        Brand = i.Brand,
        UnitPrice = i.UnitPrice,
        CreatedAtUtc = i.CreatedAtUtc
    };
}