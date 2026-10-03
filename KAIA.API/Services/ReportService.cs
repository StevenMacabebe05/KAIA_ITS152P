using KAIA.API.Data;
using KAIA.Shared.Dtos;
using Microsoft.EntityFrameworkCore;

namespace KAIA.API.Services;

public class ReportService : IReportService
{
    private readonly KaiaDbContext _db;

    public ReportService(KaiaDbContext db) => _db = db;

    // ═══════════════════════════════════════════════════════════════════
    //  DONATION REPORT
    // ═══════════════════════════════════════════════════════════════════
    public async Task<DonationReportDto> GetDonationReportAsync(CancellationToken ct = default)
    {
        var donations = await _db.Donations
            .AsNoTracking()
            .Include(d => d.Donor)
            .Include(d => d.Cause).ThenInclude(c => c!.Ngo)
            .Include(d => d.Lines)
            .ToListAsync(ct);

        if (donations.Count == 0)
            return new DonationReportDto();

        var totalValue = donations.Sum(d => d.TotalValue);
        var totalLines = donations.Sum(d => d.Lines.Count);

        // By cause
        var byCause = donations
            .GroupBy(d => new
            {
                d.CauseId,
                Title = d.Cause?.Title ?? "(unknown)",
                Ngo = d.Cause?.Ngo?.Name ?? "(unknown)"
            })
            .Select(g => new CauseBreakdownDto
            {
                CauseId = g.Key.CauseId,
                CauseTitle = g.Key.Title,
                NgoName = g.Key.Ngo,
                DonationCount = g.Count(),
                TotalValue = g.Sum(d => d.TotalValue),
                PercentOfTotal = totalValue == 0
                    ? 0
                    : Math.Round((g.Sum(d => d.TotalValue) / totalValue) * 100, 1)
            })
            .OrderByDescending(x => x.TotalValue)
            .ToList();

        // By donor
        var byDonor = donations
            .GroupBy(d => new
            {
                d.DonorId,
                Name = d.Donor?.Name ?? "(unknown)",
                Type = d.Donor?.Type.ToString() ?? "Individual"
            })
            .Select(g => new DonorBreakdownDto
            {
                DonorId = g.Key.DonorId,
                DonorName = g.Key.Name,
                DonorType = g.Key.Type,
                DonationCount = g.Count(),
                TotalValue = g.Sum(d => d.TotalValue)
            })
            .OrderByDescending(x => x.TotalValue)
            .ToList();

        // Monthly trend
        var monthlyTrend = donations
            .GroupBy(d => new
            {
                Year = d.DonatedAtUtc.Year,
                Month = d.DonatedAtUtc.Month
            })
            .Select(g => new MonthlyTotalDto
            {
                Month = $"{g.Key.Year:D4}-{g.Key.Month:D2}",
                MonthLabel = new DateTime(g.Key.Year, g.Key.Month, 1).ToString("MMM yyyy"),
                Count = g.Count(),
                TotalValue = g.Sum(d => d.TotalValue)
            })
            .OrderBy(x => x.Month)
            .ToList();

        return new DonationReportDto
        {
            TotalDonations = donations.Count,
            TotalValue = totalValue,
            AverageValue = Math.Round(totalValue / donations.Count, 2),
            TotalLineItems = totalLines,
            ByCause = byCause,
            ByDonor = byDonor,
            MonthlyTrend = monthlyTrend
        };
    }

    // ═══════════════════════════════════════════════════════════════════
    //  INVENTORY REPORT
    // ═══════════════════════════════════════════════════════════════════
    public async Task<InventoryReportDto> GetInventoryReportAsync(CancellationToken ct = default)
    {
        var incoming = await _db.DonationLines
            .GroupBy(l => l.ItemId)
            .Select(g => new { ItemId = g.Key, Qty = g.Sum(l => l.Quantity) })
            .ToDictionaryAsync(x => x.ItemId, x => x.Qty, ct);

        var outgoing = await _db.DistributionLines
            .GroupBy(l => l.ItemId)
            .Select(g => new { ItemId = g.Key, Qty = g.Sum(l => l.Quantity) })
            .ToDictionaryAsync(x => x.ItemId, x => x.Qty, ct);

        var items = await _db.Items.AsNoTracking().ToListAsync(ct);

        var rows = items.Select(i =>
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

        const int LowStockThreshold = 10;

        var lowStock = rows.Where(r => r.Stock > 0 && r.Stock < LowStockThreshold)
                               .OrderBy(r => r.Stock)
                               .ToList();
        var outOfStock = rows.Where(r => r.Stock <= 0)
                               .OrderBy(r => r.Name)
                               .ToList();
        var itemsInStock = rows.Count(r => r.Stock > 0);

        return new InventoryReportDto
        {
            TotalItems = rows.Count,
            ItemsInStock = itemsInStock,
            ItemsOutOfStock = outOfStock.Count,
            ItemsLowStock = lowStock.Count,
            TotalStockUnits = rows.Sum(r => r.Stock),
            EstimatedStockValue = rows.Sum(r => r.Stock * r.UnitPrice),
            AllItems = rows.OrderBy(r => r.Name).ToList(),
            LowStockItems = lowStock,
            OutOfStockItems = outOfStock
        };
    }

    // ═══════════════════════════════════════════════════════════════════
    //  DISTRIBUTION REPORT
    // ═══════════════════════════════════════════════════════════════════
    public async Task<DistributionReportDto> GetDistributionReportAsync(CancellationToken ct = default)
    {
        var distributions = await _db.Distributions
            .AsNoTracking()
            .Include(d => d.Cause).ThenInclude(c => c!.Ngo)
            .Include(d => d.Lines)
            .ToListAsync(ct);

        if (distributions.Count == 0)
            return new DistributionReportDto();

        var totalQty = distributions.Sum(d => d.Lines.Sum(l => l.Quantity));

        var byCause = distributions
            .GroupBy(d => new
            {
                d.CauseId,
                Title = d.Cause?.Title ?? "(unknown)",
                Ngo = d.Cause?.Ngo?.Name ?? "(unknown)"
            })
            .Select(g => new DistributionCauseBreakdownDto
            {
                CauseId = g.Key.CauseId,
                CauseTitle = g.Key.Title,
                NgoName = g.Key.Ngo,
                DistributionCount = g.Count(),
                TotalQuantity = g.Sum(d => d.Lines.Sum(l => l.Quantity))
            })
            .OrderByDescending(x => x.TotalQuantity)
            .ToList();

        var topRecipients = distributions
            .GroupBy(d => d.Recipient)
            .Select(g => new RecipientBreakdownDto
            {
                Recipient = g.Key,
                DistributionCount = g.Count(),
                TotalQuantity = g.Sum(d => d.Lines.Sum(l => l.Quantity))
            })
            .OrderByDescending(x => x.TotalQuantity)
            .Take(10)
            .ToList();

        var monthlyTrend = distributions
            .GroupBy(d => new
            {
                Year = d.DistributedAtUtc.Year,
                Month = d.DistributedAtUtc.Month
            })
            .Select(g => new MonthlyDistributionTotalDto
            {
                Month = $"{g.Key.Year:D4}-{g.Key.Month:D2}",
                MonthLabel = new DateTime(g.Key.Year, g.Key.Month, 1).ToString("MMM yyyy"),
                Count = g.Count(),
                TotalQuantity = g.Sum(d => d.Lines.Sum(l => l.Quantity))
            })
            .OrderBy(x => x.Month)
            .ToList();

        var uniqueRecipients = distributions
            .Select(d => d.Recipient)
            .Distinct()
            .Count();

        return new DistributionReportDto
        {
            TotalDistributions = distributions.Count,
            TotalQuantityDistributed = totalQty,
            AverageItemsPerDistribution = Math.Round((decimal)totalQty / distributions.Count, 1),
            UniqueRecipients = uniqueRecipients,
            ByCause = byCause,
            TopRecipients = topRecipients,
            MonthlyTrend = monthlyTrend
        };
    }

    // ═══════════════════════════════════════════════════════════════════
    //  CAUSE PROGRESS
    // ═══════════════════════════════════════════════════════════════════
    public async Task<IReadOnlyList<CauseProgressDto>> GetCauseProgressAsync(CancellationToken ct = default)
    {
        var causes = await _db.Causes
            .AsNoTracking()
            .Include(c => c.Ngo)
            .ToListAsync(ct);

        if (causes.Count == 0) return Array.Empty<CauseProgressDto>();

        var donationTotals = await _db.Donations
            .GroupBy(d => d.CauseId)
            .Select(g => new
            {
                CauseId = g.Key,
                Total = g.Sum(d => d.TotalValue),
                Count = g.Count()
            })
            .ToDictionaryAsync(x => x.CauseId, x => new { x.Total, x.Count }, ct);

        var distributionCounts = await _db.Distributions
            .GroupBy(d => d.CauseId)
            .Select(g => new { CauseId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.CauseId, x => x.Count, ct);

        var now = DateTime.UtcNow;

        return causes.Select(c =>
        {
            var donation = donationTotals.GetValueOrDefault(c.Id);
            var raised = donation?.Total ?? 0;
            var donCount = donation?.Count ?? 0;
            var distCount = distributionCounts.GetValueOrDefault(c.Id, 0);

            var percent = c.GoalAmount == 0
                ? 0
                : Math.Round((raised / c.GoalAmount) * 100, 1);

            return new CauseProgressDto
            {
                CauseId = c.Id,
                Title = c.Title,
                NgoName = c.Ngo?.Name ?? string.Empty,
                Status = c.Status.ToString(),
                GoalAmount = c.GoalAmount,
                RaisedAmount = raised,
                PercentComplete = percent,
                DonationCount = donCount,
                DistributionCount = distCount,
                Deadline = c.Deadline,
                DaysRemaining = (int)Math.Ceiling((c.Deadline - now).TotalDays)
            };
        })
        .OrderByDescending(x => x.PercentComplete)
        .ToList();
    }
}

