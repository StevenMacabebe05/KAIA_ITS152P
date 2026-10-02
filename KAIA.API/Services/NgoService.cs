using KAIA.API.Data;
using KAIA.API.Models;
using KAIA.Shared.Dtos;
using Microsoft.EntityFrameworkCore;

namespace KAIA.API.Services;

public class NgoService : INgoService
{
    private readonly KaiaDbContext _db;

    public NgoService(KaiaDbContext db) => _db = db;

    public async Task<IReadOnlyList<NgoDto>> GetAllAsync(CancellationToken ct = default)
    {
        return await _db.Ngos
            .AsNoTracking()
            .OrderBy(n => n.Name)
            .Select(n => ToDto(n))
            .ToListAsync(ct);
    }

    public async Task<NgoDto?> GetByIdAsync(int id, CancellationToken ct = default)
    {
        var ngo = await _db.Ngos
            .AsNoTracking()
            .FirstOrDefaultAsync(n => n.Id == id, ct);

        return ngo is null ? null : ToDto(ngo);
    }

    public async Task<NgoDto> CreateAsync(CreateNgoDto dto, CancellationToken ct = default)
    {
        var ngo = new Ngo
        {
            Name = dto.Name.Trim(),
            Description = Clean(dto.Description),
            ContactEmail = Clean(dto.ContactEmail),
            ContactPhone = Clean(dto.ContactPhone),
            Website = Clean(dto.Website),
            VerificationStatus = NgoVerificationStatus.Pending,
            CreatedAtUtc = DateTime.UtcNow
        };

        _db.Ngos.Add(ngo);
        await _db.SaveChangesAsync(ct);
        return ToDto(ngo);
    }

    public async Task<NgoDto?> UpdateAsync(int id, UpdateNgoDto dto, CancellationToken ct = default)
    {
        var ngo = await _db.Ngos.FirstOrDefaultAsync(n => n.Id == id, ct);
        if (ngo is null) return null;

        ngo.Name = dto.Name.Trim();
        ngo.Description = Clean(dto.Description);
        ngo.ContactEmail = Clean(dto.ContactEmail);
        ngo.ContactPhone = Clean(dto.ContactPhone);
        ngo.Website = Clean(dto.Website);

        await _db.SaveChangesAsync(ct);
        return ToDto(ngo);
    }

    public async Task<NgoDto?> UpdateVerificationStatusAsync(int id, string status, CancellationToken ct = default)
    {
        if (!Enum.TryParse<NgoVerificationStatus>(status, ignoreCase: true, out var parsed))
            throw new ArgumentException($"Invalid verification status: '{status}'.");

        var ngo = await _db.Ngos.FirstOrDefaultAsync(n => n.Id == id, ct);
        if (ngo is null) return null;

        ngo.VerificationStatus = parsed;
        await _db.SaveChangesAsync(ct);
        return ToDto(ngo);
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken ct = default)
    {
        var ngo = await _db.Ngos.FirstOrDefaultAsync(n => n.Id == id, ct);
        if (ngo is null) return false;

        _db.Ngos.Remove(ngo);
        await _db.SaveChangesAsync(ct);
        return true;
    }

    // ─── Helpers ───────────────────────────────────────────────────────
    private static NgoDto ToDto(Ngo n) => new()
    {
        Id = n.Id,
        Name = n.Name,
        Description = n.Description,
        ContactEmail = n.ContactEmail,
        ContactPhone = n.ContactPhone,
        Website = n.Website,
        VerificationStatus = n.VerificationStatus.ToString(),
        CreatedAtUtc = n.CreatedAtUtc
    };

    /// <summary>Trims a string and converts empty/whitespace to null.</summary>
    private static string? Clean(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}