using KAIA.API.Data;
using KAIA.API.Models;
using KAIA.Shared.Dtos;
using Microsoft.EntityFrameworkCore;

namespace KAIA.API.Services;

public class CauseService : ICauseService
{
    private readonly KaiaDbContext _db;

    public CauseService(KaiaDbContext db) => _db = db;

    public async Task<IReadOnlyList<CauseDto>> GetAllAsync(
        int? ngoId = null,
        string? status = null,
        CancellationToken ct = default)
    {
        var query = _db.Causes
            .AsNoTracking()
            .Include(c => c.Ngo)
            .AsQueryable();

        if (ngoId.HasValue && ngoId.Value > 0)
            query = query.Where(c => c.NgoId == ngoId.Value);

        if (!string.IsNullOrWhiteSpace(status) &&
            Enum.TryParse<CauseStatus>(status, ignoreCase: true, out var parsed))
        {
            query = query.Where(c => c.Status == parsed);
        }

        return await query
            .OrderByDescending(c => c.CreatedAtUtc)
            .Select(c => ToDto(c))
            .ToListAsync(ct);
    }

    public async Task<CauseDto?> GetByIdAsync(int id, CancellationToken ct = default)
    {
        var cause = await _db.Causes
            .AsNoTracking()
            .Include(c => c.Ngo)
            .FirstOrDefaultAsync(c => c.Id == id, ct);

        return cause is null ? null : ToDto(cause);
    }

    public async Task<CauseDto> CreateAsync(CreateCauseDto dto, CancellationToken ct = default)
    {
        var cause = new Cause
        {
            NgoId = dto.NgoId,
            Title = dto.Title.Trim(),
            Description = Clean(dto.Description),
            GoalAmount = dto.GoalAmount,
            Deadline = DateTime.SpecifyKind(dto.Deadline, DateTimeKind.Utc),
            Status = CauseStatus.Active,
            CreatedAtUtc = DateTime.UtcNow
        };

        _db.Causes.Add(cause);
        await _db.SaveChangesAsync(ct);

        // Re-query with Include so NgoName is populated in the response
        var created = await _db.Causes
            .AsNoTracking()
            .Include(c => c.Ngo)
            .FirstAsync(c => c.Id == cause.Id, ct);

        return ToDto(created);
    }

    public async Task<CauseDto?> UpdateAsync(int id, UpdateCauseDto dto, CancellationToken ct = default)
    {
        var cause = await _db.Causes
            .Include(c => c.Ngo)
            .FirstOrDefaultAsync(c => c.Id == id, ct);
        if (cause is null) return null;

        cause.NgoId = dto.NgoId;
        cause.Title = dto.Title.Trim();
        cause.Description = Clean(dto.Description);
        cause.GoalAmount = dto.GoalAmount;
        cause.Deadline = DateTime.SpecifyKind(dto.Deadline, DateTimeKind.Utc);

        if (Enum.TryParse<CauseStatus>(dto.Status, ignoreCase: true, out var parsedStatus))
            cause.Status = parsedStatus;

        await _db.SaveChangesAsync(ct);

        // Re-load NGO in case NgoId changed
        if (cause.Ngo is null || cause.Ngo.Id != cause.NgoId)
        {
            var reloaded = await _db.Causes
                .AsNoTracking()
                .Include(c => c.Ngo)
                .FirstAsync(c => c.Id == cause.Id, ct);
            return ToDto(reloaded);
        }

        return ToDto(cause);
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken ct = default)
    {
        var cause = await _db.Causes.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (cause is null) return false;

        var hasDonations = await _db.Donations.AnyAsync(d => d.CauseId == id, ct);
        if (hasDonations)
            throw new InvalidOperationException(
                $"Cannot delete '{cause.Title}' because it has donations on record. Delete its donations first.");

        _db.Causes.Remove(cause);
        await _db.SaveChangesAsync(ct);
        return true;
    }

    public Task<bool> NgoExistsAsync(int ngoId, CancellationToken ct = default)
    {
        return _db.Ngos.AnyAsync(n => n.Id == ngoId, ct);
    }

    // ─── Helpers ───────────────────────────────────────────────────────
    private static CauseDto ToDto(Cause c) => new()
    {
        Id = c.Id,
        NgoId = c.NgoId,
        NgoName = c.Ngo?.Name ?? string.Empty,
        Title = c.Title,
        Description = c.Description,
        GoalAmount = c.GoalAmount,
        Deadline = c.Deadline,
        Status = c.Status.ToString(),
        CreatedAtUtc = c.CreatedAtUtc
    };

    private static string? Clean(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}