namespace KAIA.Shared.Dtos;

/// <summary>Read model returned by GET /api/distributions.</summary>
public record DistributionDto
{
    public int Id { get; init; }
    public int CauseId { get; init; }
    public string CauseTitle { get; init; } = string.Empty;
    public string NgoName { get; init; } = string.Empty;
    public DateTime DistributedAtUtc { get; init; }
    public string Recipient { get; init; } = string.Empty;
    public string? Notes { get; init; }
    public IReadOnlyList<DistributionLineDto> Lines { get; init; } = Array.Empty<DistributionLineDto>();
}