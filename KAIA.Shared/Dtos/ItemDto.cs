namespace KAIA.Shared.Dtos;

/// <summary>
/// Read model returned by the API. Includes a server-computed Category
/// derived from the first two characters of Code (e.g. "FD" = Food).
/// </summary>
public record ItemDto
{
    public int Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string Code { get; init; } = string.Empty;
    public string Brand { get; init; } = string.Empty;
    public decimal UnitPrice { get; init; }
    public DateTime CreatedAtUtc { get; init; }

    /// <summary>Two-letter category prefix extracted from Code. "OT" if Code is too short.</summary>
    public string Category => Code.Length >= 2 ? Code[..2].ToUpperInvariant() : "OT";
}