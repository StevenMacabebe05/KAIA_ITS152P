namespace KAIA.API.Models;

/// <summary>
/// An event: a donor gave items to a cause on a specific date.
/// A donation contains one or more lines, each with an item + quantity.
/// </summary>
public class Donation
{
    public int Id { get; set; }

    public int DonorId { get; set; }
    public Donor? Donor { get; set; }

    public int CauseId { get; set; }
    public Cause? Cause { get; set; }

    public DateTime DonatedAtUtc { get; set; }

    public string? Notes { get; set; }

    /// <summary>Server-computed: sum of (line.Quantity × line.UnitPriceAtTimeOfDonation).</summary>
    public decimal TotalValue { get; set; }

    public List<DonationLine> Lines { get; set; } = new();
}