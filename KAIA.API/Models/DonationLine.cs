namespace KAIA.API.Models;

/// <summary>
/// One item within a donation, with its quantity.
/// Snapshots the item's unit price at donation time so later
/// price changes don't rewrite historical records.
/// </summary>
public class DonationLine
{
    public int Id { get; set; }

    public int DonationId { get; set; }
    public Donation? Donation { get; set; }

    public int ItemId { get; set; }
    public Item? Item { get; set; }

    public int Quantity { get; set; }

    public decimal UnitPriceAtTimeOfDonation { get; set; }
}