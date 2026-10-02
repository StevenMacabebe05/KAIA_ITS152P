namespace KAIA.Shared.Dtos;

/// <summary>Read model returned by GET /api/ngos.</summary>
public record NgoDto
{
    public int Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string? Description { get; init; }
    public string? ContactEmail { get; init; }
    public string? ContactPhone { get; init; }
    public string? Website { get; init; }

    /// <summary>Serialized as a string ("Pending", "Verified", "Rejected").</summary>
    public string VerificationStatus { get; init; } = "Pending";

    public DateTime CreatedAtUtc { get; init; }
}