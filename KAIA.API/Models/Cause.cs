namespace KAIA.API.Models;

/// <summary>
/// A specific fundraising campaign run by an NGO.
/// Every cause belongs to exactly one NGO.
/// </summary>
public class Cause
{
    public int Id { get; set; }

    public int NgoId { get; set; }
    public Ngo? Ngo { get; set; }

    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    public decimal GoalAmount { get; set; }

    public DateTime Deadline { get; set; }

    public CauseStatus Status { get; set; } = CauseStatus.Active;

    public DateTime CreatedAtUtc { get; set; }
}