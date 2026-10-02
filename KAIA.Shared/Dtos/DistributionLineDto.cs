namespace KAIA.Shared.Dtos;

/// <summary>Read model for one line within a distribution.</summary>
public record DistributionLineDto
{
    public int Id { get; init; }
    public int ItemId { get; init; }
    public string ItemName { get; init; } = string.Empty;
    public string ItemCode { get; init; } = string.Empty;
    public int Quantity { get; init; }
}