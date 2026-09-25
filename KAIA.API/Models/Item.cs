namespace KAIA.API.Models;

/// <summary>
/// Persistence entity for a donation item. Never returned directly by the API —
/// the service layer maps it to KAIA.Shared.Dtos.ItemDto.
/// </summary>
public class Item
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Brand { get; set; } = string.Empty;
    public decimal UnitPrice { get; set; }

    /// <summary>Server-set on create. Never modified by clients. Used by the dashboard's "recently added" stat.</summary>
    public DateTime CreatedAtUtc { get; set; }
}