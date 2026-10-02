namespace KAIA.API.Models;

/// <summary>
/// An event: items were given out from the warehouse to a recipient,
/// associated with a specific cause. Contains one or more lines.
/// </summary>
public class Distribution
{
    public int Id { get; set; }

    public int CauseId { get; set; }
    public Cause? Cause { get; set; }

    public DateTime DistributedAtUtc { get; set; }

    public string Recipient { get; set; } = string.Empty;

    public string? Notes { get; set; }

    public List<DistributionLine> Lines { get; set; } = new();
}