namespace KAIA.Shared.Dtos;

public record CauseProgressDto
{
    public int CauseId { get; init; }
    public string Title { get; init; } = string.Empty;
    public string NgoName { get; init; } = string.Empty;
    public string Status { get; init; } = string.Empty;

    public decimal GoalAmount { get; init; }
    public decimal RaisedAmount { get; init; }
    public decimal PercentComplete { get; init; }

    public int DonationCount { get; init; }
    public int DistributionCount { get; init; }

    public DateTime Deadline { get; init; }
    public int DaysRemaining { get; init; }
}