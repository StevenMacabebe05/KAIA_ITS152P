namespace KAIA.Shared.Dtos;

/// <summary>Read model returned by GET /api/causes. Includes the NGO's name.</summary>
public record CauseDto
{
    public int Id { get; init; }
    public int NgoId { get; init; }

    /// <summary>Denormalized for display — avoids a second lookup on the client.</summary>
    public string NgoName { get; init; } = string.Empty;

    public string Title { get; init; } = string.Empty;
    public string? Description { get; init; }
    public decimal GoalAmount { get; init; }

    /// <summary>
    /// Sum of donation TotalValue for this cause. Derived — never sent by the client.
    /// Powers the progress bar on the Causes page.
    /// </summary>
    public decimal RaisedAmount { get; init; }

    public DateTime Deadline { get; init; }
    public string Status { get; init; } = "Active";
    public DateTime CreatedAtUtc { get; init; }
}