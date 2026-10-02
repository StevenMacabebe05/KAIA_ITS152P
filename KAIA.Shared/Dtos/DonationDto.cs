namespace KAIA.Shared.Dtos;

/// <summary>
/// Read model returned by GET /api/donations. Includes denormalized
/// names so the client doesn't need extra lookups.
/// </summary>
public record DonationDto
{
    public int Id { get; init; }
    public int DonorId { get; init; }
    public string DonorName { get; init; } = string.Empty;

    public int CauseId { get; init; }
    public string CauseTitle { get; init; } = string.Empty;
    public string NgoName { get; init; } = string.Empty;

    public DateTime DonatedAtUtc { get; init; }
    public string? Notes { get; init; }
    public decimal TotalValue { get; init; }

    public IReadOnlyList<DonationLineDto> Lines { get; init; } = Array.Empty<DonationLineDto>();
}