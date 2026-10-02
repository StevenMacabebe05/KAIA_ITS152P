namespace KAIA.API.Models;

/// <summary>
/// One item within a distribution, with its quantity.
/// </summary>
public class DistributionLine
{
    public int Id { get; set; }

    public int DistributionId { get; set; }
    public Distribution? Distribution { get; set; }

    public int ItemId { get; set; }
    public Item? Item { get; set; }

    public int Quantity { get; set; }
}