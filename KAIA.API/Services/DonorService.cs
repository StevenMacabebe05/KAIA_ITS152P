using KAIA.API.Data;
using KAIA.API.Models;
using KAIA.Shared.Dtos;
using Microsoft.EntityFrameworkCore;

namespace KAIA.API.Services;

public class DonorService : IDonorService
{
    private readonly KaiaDbContext _db;

    public DonorService(KaiaDbContext db) => _db = db;

    public async Task<IReadOnlyList<DonorDto>> GetAllAsync(
        string? type = null,
        CancellationToken ct = default)
    {
        var query = _db.Donors
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(type) &&
            Enum.TryParse<DonorType>(type, ignoreCase: true, out var parsed))
        {
            query = query.Where(d => d.Type == parsed);
        }

        return await query
            .OrderBy(d => d.Name)
            .Select(d => ToDto(d))
            .ToListAsync(ct);
    }

    public async Task<DonorDto?> GetByIdAsync(int id, CancellationToken ct = default)
    {
        var donor = await _db.Donors
            .AsNoTracking()
            .FirstOrDefaultAsync(d => d.Id == id, ct);

        return donor is null ? null : ToDto(donor);
    }

    public async Task<DonorDto> CreateAsync(CreateDonorDto dto, CancellationToken ct = default)
    {
        var donor = new Donor
        {
            Name = dto.Name.Trim(),
            Email = Clean(dto.Email),
            Phone = Clean(dto.Phone),
            Type = ParseType(dto.Type),
            CreatedAtUtc = DateTime.UtcNow
        };

        _db.Donors.Add(donor);
        await _db.SaveChangesAsync(ct);
        return ToDto(donor);
    }

    public async Task<DonorDto?> UpdateAsync(int id, UpdateDonorDto dto, CancellationToken ct = default)
    {
        var donor = await _db.Donors.FirstOrDefaultAsync(d => d.Id == id, ct);
        if (donor is null) return null;

        donor.Name = dto.Name.Trim();
        donor.Email = Clean(dto.Email);
        donor.Phone = Clean(dto.Phone);
        donor.Type = ParseType(dto.Type);

        await _db.SaveChangesAsync(ct);
        return ToDto(donor);
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken ct = default)
    {
        var donor = await _db.Donors.FirstOrDefaultAsync(d => d.Id == id, ct);
        if (donor is null) return false;

        var hasDonations = await _db.Donations.AnyAsync(d => d.DonorId == id, ct);
        if (hasDonations)
            throw new InvalidOperationException(
                $"Cannot delete '{donor.Name}' because they have donations on record. Delete their donations first.");

        _db.Donors.Remove(donor);
        await _db.SaveChangesAsync(ct);
        return true;
    }

    // ─── Helpers ───────────────────────────────────────────────────────
    private static DonorDto ToDto(Donor d) => new()
    {
        Id = d.Id,
        Name = d.Name,
        Email = d.Email,
        Phone = d.Phone,
        Type = d.Type.ToString(),
        CreatedAtUtc = d.CreatedAtUtc
    };

    private static DonorType ParseType(string type)
        => Enum.TryParse<DonorType>(type, ignoreCase: true, out var parsed)
            ? parsed
            : DonorType.Individual;

    private static string? Clean(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}