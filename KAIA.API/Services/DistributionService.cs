using KAIA.API.Data;
using KAIA.API.Models;
using KAIA.Shared.Dtos;
using Microsoft.EntityFrameworkCore;

namespace KAIA.API.Services;

public class DistributionService : IDistributionService
{
    private readonly KaiaDbContext _db;

    public DistributionService(KaiaDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<DistributionDto>> GetAllAsync(
        int? causeId = null,
        CancellationToken ct = default)
    {
        var query = _db.Distributions
            .AsNoTracking()
            .Include(d => d.Cause).ThenInclude(c => c!.Ngo)
            .Include(d => d.Lines).ThenInclude(l => l.Item)
            .AsQueryable();

        if (causeId.HasValue && causeId.Value > 0)
            query = query.Where(d => d.CauseId == causeId.Value);

        var list = await query
            .OrderByDescending(d => d.DistributedAtUtc)
            .ToListAsync(ct);

        return list.Select(ToDto).ToList();
    }

    public async Task<DistributionDto?> GetByIdAsync(int id, CancellationToken ct = default)
    {
        var dist = await _db.Distributions
            .AsNoTracking()
            .Include(d => d.Cause).ThenInclude(c => c!.Ngo)
            .Include(d => d.Lines).ThenInclude(l => l.Item)
            .FirstOrDefaultAsync(d => d.Id == id, ct);

        return dist is null ? null : ToDto(dist);
    }

    public async Task<DistributionDto> CreateAsync(CreateDistributionDto dto, CancellationToken ct = default)
    {
        await ValidateStockAsync(
            dto.Lines.Select(l => (l.ItemId, l.Quantity)),
            excludeDistributionId: null,
            ct);

        var dist = new Distribution
        {
            CauseId = dto.CauseId,
            DistributedAtUtc = DateTime.SpecifyKind(dto.DistributedAtUtc, DateTimeKind.Utc),
            Recipient = dto.Recipient.Trim(),
            Notes = Clean(dto.Notes)
        };

        foreach (var line in dto.Lines)
        {
            dist.Lines.Add(new DistributionLine
            {
                ItemId = line.ItemId,
                Quantity = line.Quantity
            });
        }

        _db.Distributions.Add(dist);
        await _db.SaveChangesAsync(ct);

        var created = await _db.Distributions
            .AsNoTracking()
            .Include(d => d.Cause).ThenInclude(c => c!.Ngo)
            .Include(d => d.Lines).ThenInclude(l => l.Item)
            .FirstAsync(d => d.Id == dist.Id, ct);

        return ToDto(created);
    }

    public async Task<DistributionDto?> UpdateAsync(
        int id,
        UpdateDistributionDto dto,
        CancellationToken ct = default)
    {
        var dist = await _db.Distributions
            .Include(d => d.Lines)
            .FirstOrDefaultAsync(d => d.Id == id, ct);
        if (dist is null) return null;

        await ValidateStockAsync(
            dto.Lines.Select(l => (l.ItemId, l.Quantity)),
            excludeDistributionId: id,
            ct);

        dist.CauseId = dto.CauseId;
        dist.DistributedAtUtc = DateTime.SpecifyKind(dto.DistributedAtUtc, DateTimeKind.Utc);
        dist.Recipient = dto.Recipient.Trim();
        dist.Notes = Clean(dto.Notes);

        _db.DistributionLines.RemoveRange(dist.Lines);
        dist.Lines.Clear();

        foreach (var line in dto.Lines)
        {
            dist.Lines.Add(new DistributionLine
            {
                DistributionId = dist.Id,
                ItemId = line.ItemId,
                Quantity = line.Quantity
            });
        }

        await _db.SaveChangesAsync(ct);

        var updated = await _db.Distributions
            .AsNoTracking()
            .Include(d => d.Cause).ThenInclude(c => c!.Ngo)
            .Include(d => d.Lines).ThenInclude(l => l.Item)
            .FirstAsync(d => d.Id == id, ct);

        return ToDto(updated);
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken ct = default)
    {
        var dist = await _db.Distributions
            .Include(d => d.Lines)
            .FirstOrDefaultAsync(d => d.Id == id, ct);
        if (dist is null) return false;

        _db.Distributions.Remove(dist);
        await _db.SaveChangesAsync(ct);
        return true;
    }

    public Task<bool> CauseExistsAsync(int causeId, CancellationToken ct = default)
        => _db.Causes.AnyAsync(c => c.Id == causeId, ct);

    public async Task<IReadOnlyList<int>> FindMissingItemIdsAsync(
        IEnumerable<int> itemIds,
        CancellationToken ct = default)
    {
        var distinct = itemIds.Distinct().ToList();
        var found = await _db.Items
            .Where(i => distinct.Contains(i.Id))
            .Select(i => i.Id)
            .ToListAsync(ct);

        return distinct.Except(found).ToList();
    }

    // ─── Stock validation ──────────────────────────────────────────────
    private async Task ValidateStockAsync(
        IEnumerable<(int ItemId, int Quantity)> requestedLines,
        int? excludeDistributionId,
        CancellationToken ct)
    {
        var lines = requestedLines.ToList();
        if (lines.Count == 0) return;

        var itemIds = lines.Select(l => l.ItemId).Distinct().ToList();

        var incoming = await _db.DonationLines
            .Where(l => itemIds.Contains(l.ItemId))
            .GroupBy(l => l.ItemId)
            .Select(g => new { ItemId = g.Key, Qty = g.Sum(l => l.Quantity) })
            .ToDictionaryAsync(x => x.ItemId, x => x.Qty, ct);

        var outgoingQuery = _db.DistributionLines
            .Where(l => itemIds.Contains(l.ItemId));

        if (excludeDistributionId.HasValue)
        {
            outgoingQuery = outgoingQuery.Where(l => l.DistributionId != excludeDistributionId.Value);
        }

        var outgoing = await outgoingQuery
            .GroupBy(l => l.ItemId)
            .Select(g => new { ItemId = g.Key, Qty = g.Sum(l => l.Quantity) })
            .ToDictionaryAsync(x => x.ItemId, x => x.Qty, ct);

        var requestedTotals = lines
            .GroupBy(l => l.ItemId)
            .ToDictionary(g => g.Key, g => g.Sum(l => l.Quantity));

        var errors = new List<string>();
        foreach (var (itemId, requested) in requestedTotals)
        {
            var inQty = incoming.GetValueOrDefault(itemId, 0);
            var outQty = outgoing.GetValueOrDefault(itemId, 0);
            var available = inQty - outQty;

            if (requested > available)
            {
                var item = await _db.Items
                    .AsNoTracking()
                    .Where(i => i.Id == itemId)
                    .Select(i => new { i.Name, i.Code })
                    .FirstOrDefaultAsync(ct);

                var label = item is null
                    ? $"Item #{itemId}"
                    : $"{item.Name} ({item.Code})";

                errors.Add($"Cannot distribute {requested} × {label}. Only {available} in stock.");
            }
        }

        if (errors.Count > 0)
        {
            throw new InvalidOperationException(string.Join(" ", errors));
        }
    }

    // ─── Helpers ───────────────────────────────────────────────────────
    private static DistributionDto ToDto(Distribution d)
    {
        var lines = d.Lines
            .OrderBy(l => l.Item?.Name ?? string.Empty)
            .Select(l => new DistributionLineDto
            {
                Id = l.Id,
                ItemId = l.ItemId,
                ItemName = l.Item?.Name ?? string.Empty,
                ItemCode = l.Item?.Code ?? string.Empty,
                Quantity = l.Quantity
            })
            .ToList();

        return new DistributionDto
        {
            Id = d.Id,
            CauseId = d.CauseId,
            CauseTitle = d.Cause?.Title ?? string.Empty,
            NgoName = d.Cause?.Ngo?.Name ?? string.Empty,
            DistributedAtUtc = d.DistributedAtUtc,
            Recipient = d.Recipient,
            Notes = d.Notes,
            Lines = lines
        };
    }

    private static string? Clean(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}