using KAIA.API.Data;
using KAIA.API.Models;
using KAIA.Shared.Dtos;
using Microsoft.EntityFrameworkCore;

namespace KAIA.API.Services;

public class DonationService : IDonationService
{
    private readonly KaiaDbContext _db;

    public DonationService(KaiaDbContext db) => _db = db;

    public async Task<IReadOnlyList<DonationDto>> GetAllAsync(
        int? donorId = null,
        int? causeId = null,
        CancellationToken ct = default)
    {
        var query = _db.Donations
            .AsNoTracking()
            .Include(d => d.Donor)
            .Include(d => d.Cause).ThenInclude(c => c!.Ngo)
            .Include(d => d.Lines).ThenInclude(l => l.Item)
            .AsQueryable();

        if (donorId.HasValue && donorId.Value > 0)
            query = query.Where(d => d.DonorId == donorId.Value);

        if (causeId.HasValue && causeId.Value > 0)
            query = query.Where(d => d.CauseId == causeId.Value);

        var list = await query
            .OrderByDescending(d => d.DonatedAtUtc)
            .ToListAsync(ct);

        return list.Select(ToDto).ToList();
    }

    public async Task<DonationDto?> GetByIdAsync(int id, CancellationToken ct = default)
    {
        var donation = await _db.Donations
            .AsNoTracking()
            .Include(d => d.Donor)
            .Include(d => d.Cause).ThenInclude(c => c!.Ngo)
            .Include(d => d.Lines).ThenInclude(l => l.Item)
            .FirstOrDefaultAsync(d => d.Id == id, ct);

        return donation is null ? null : ToDto(donation);
    }

    public async Task<DonationDto> CreateAsync(CreateDonationDto dto, CancellationToken ct = default)
    {
        // Load the referenced items so we can snapshot their prices
        var itemIds = dto.Lines.Select(l => l.ItemId).Distinct().ToList();
        var items = await _db.Items
            .Where(i => itemIds.Contains(i.Id))
            .ToDictionaryAsync(i => i.Id, i => i, ct);

        var donation = new Donation
        {
            DonorId = dto.DonorId,
            CauseId = dto.CauseId,
            DonatedAtUtc = DateTime.SpecifyKind(dto.DonatedAtUtc, DateTimeKind.Utc),
            Notes = Clean(dto.Notes)
        };

        decimal total = 0;
        foreach (var line in dto.Lines)
        {
            var item = items[line.ItemId];
            var unitPrice = item.UnitPrice;

            donation.Lines.Add(new DonationLine
            {
                ItemId = item.Id,
                Quantity = line.Quantity,
                UnitPriceAtTimeOfDonation = unitPrice
            });

            total += line.Quantity * unitPrice;
        }
        donation.TotalValue = total;

        _db.Donations.Add(donation);
        await _db.SaveChangesAsync(ct);

        // ═══════════════════════════════════════════════════════════════
        // IMPORTANT: The stock calculation in InventoryService sums up
        // ALL DonationLines for an item. If the initial stock of 1 was
        // NOT recorded as a DonationLine, it will be invisible here.
        //
        // Check your database seed: does the item have an existing
        // DonationLine with Quantity = 1? If not, the "1" came from
        // somewhere else and needs to be migrated into a DonationLine
        // (or the InventoryService needs to account for an InitialStock
        // field on the Item model).
        // ═══════════════════════════════════════════════════════════════

        // Reload with all navigations populated for the response
        var created = await _db.Donations
            .AsNoTracking()
            .Include(d => d.Donor)
            .Include(d => d.Cause).ThenInclude(c => c!.Ngo)
            .Include(d => d.Lines).ThenInclude(l => l.Item)
            .FirstAsync(d => d.Id == donation.Id, ct);

        return ToDto(created);
    }

    public async Task<DonationDto?> UpdateAsync(int id, UpdateDonationDto dto, CancellationToken ct = default)
    {
        var donation = await _db.Donations
            .Include(d => d.Lines)
            .FirstOrDefaultAsync(d => d.Id == id, ct);
        if (donation is null) return null;

        // Load items for price snapshot
        var itemIds = dto.Lines.Select(l => l.ItemId).Distinct().ToList();
        var items = await _db.Items
            .Where(i => itemIds.Contains(i.Id))
            .ToDictionaryAsync(i => i.Id, i => i, ct);

        donation.DonorId = dto.DonorId;
        donation.CauseId = dto.CauseId;
        donation.DonatedAtUtc = DateTime.SpecifyKind(dto.DonatedAtUtc, DateTimeKind.Utc);
        donation.Notes = Clean(dto.Notes);

        // Replace lines: remove all old, add new
        _db.DonationLines.RemoveRange(donation.Lines);
        donation.Lines.Clear();

        decimal total = 0;
        foreach (var line in dto.Lines)
        {
            var item = items[line.ItemId];
            var unitPrice = item.UnitPrice;

            donation.Lines.Add(new DonationLine
            {
                DonationId = donation.Id,
                ItemId = item.Id,
                Quantity = line.Quantity,
                UnitPriceAtTimeOfDonation = unitPrice
            });

            total += line.Quantity * unitPrice;
        }
        donation.TotalValue = total;

        await _db.SaveChangesAsync(ct);

        var updated = await _db.Donations
            .AsNoTracking()
            .Include(d => d.Donor)
            .Include(d => d.Cause).ThenInclude(c => c!.Ngo)
            .Include(d => d.Lines).ThenInclude(l => l.Item)
            .FirstAsync(d => d.Id == id, ct);

        return ToDto(updated);
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken ct = default)
    {
        var donation = await _db.Donations
            .Include(d => d.Lines)
            .FirstOrDefaultAsync(d => d.Id == id, ct);
        if (donation is null) return false;

        _db.Donations.Remove(donation);   // cascade deletes lines
        await _db.SaveChangesAsync(ct);
        return true;
    }

    public Task<bool> DonorExistsAsync(int donorId, CancellationToken ct = default)
        => _db.Donors.AnyAsync(d => d.Id == donorId, ct);

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

    // ─── Helpers ───────────────────────────────────────────────────────
    private static DonationDto ToDto(Donation d)
    {
        var lines = d.Lines
            .OrderBy(l => l.Item?.Name ?? string.Empty)
            .Select(l => new DonationLineDto
            {
                Id = l.Id,
                ItemId = l.ItemId,
                ItemName = l.Item?.Name ?? string.Empty,
                ItemCode = l.Item?.Code ?? string.Empty,
                Quantity = l.Quantity,
                UnitPriceAtTimeOfDonation = l.UnitPriceAtTimeOfDonation,
                Subtotal = l.Quantity * l.UnitPriceAtTimeOfDonation
            })
            .ToList();

        return new DonationDto
        {
            Id = d.Id,
            DonorId = d.DonorId,
            DonorName = d.Donor?.Name ?? string.Empty,
            CauseId = d.CauseId,
            CauseTitle = d.Cause?.Title ?? string.Empty,
            NgoName = d.Cause?.Ngo?.Name ?? string.Empty,
            DonatedAtUtc = d.DonatedAtUtc,
            Notes = d.Notes,
            TotalValue = d.TotalValue,
            Lines = lines
        };
    }

    private static string? Clean(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}