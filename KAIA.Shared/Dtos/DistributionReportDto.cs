namespace KAIA.Shared.Dtos;

public record DistributionReportDto
{
    public int TotalDistributions { get; init; }
    public int TotalQuantityDistributed { get; init; }
    public decimal AverageItemsPerDistribution { get; init; }
    public int UniqueRecipients { get; init; }

    public IReadOnlyList<DistributionCauseBreakdownDto> ByCause { get; init; } = Array.Empty<DistributionCauseBreakdownDto>();
    public IReadOnlyList<RecipientBreakdownDto> TopRecipients { get; init; } = Array.Empty<RecipientBreakdownDto>();
    public IReadOnlyList<MonthlyDistributionTotalDto> MonthlyTrend { get; init; } = Array.Empty<MonthlyDistributionTotalDto>();
}

public record DistributionCauseBreakdownDto
{
    public int CauseId { get; init; }
    public string CauseTitle { get; init; } = string.Empty;
    public string NgoName { get; init; } = string.Empty;
    public int DistributionCount { get; init; }
    public int TotalQuantity { get; init; }
}

public record RecipientBreakdownDto
{
    public string Recipient { get; init; } = string.Empty;
    public int DistributionCount { get; init; }
    public int TotalQuantity { get; init; }
}

public record MonthlyDistributionTotalDto
{
    public string Month { get; init; } = string.Empty;
    public string MonthLabel { get; init; } = string.Empty;
    public int Count { get; init; }
    public int TotalQuantity { get; init; }
}