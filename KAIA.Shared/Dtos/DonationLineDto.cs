namespace KAIA.Shared.Dtos;

/// <summary>Read model for a single line within a donation.</summary>
public record DonationLineDto
{
    public int Id { get; init; }
    public int ItemId { get; init; }
    public string ItemName { get; init; } = string.Empty;
    public string ItemCode { get; init; } = string.Empty;
    public int Quantity { get; init; }
    public decimal UnitPriceAtTimeOfDonation { get; init; }
    public decimal Subtotal { get; init; }
}