namespace KAIA.Shared.Dtos;

/// <summary>Read model returned by GET /api/donors.</summary>
public record DonorDto
{
    public int Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string? Email { get; init; }
    public string? Phone { get; init; }

    /// <summary>Serialized as a string ("Individual" or "Organization").</summary>
    public string Type { get; init; } = "Individual";

    public DateTime CreatedAtUtc { get; init; }
}