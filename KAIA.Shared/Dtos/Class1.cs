namespace KAIA.Shared.Dtos;

public record DonationReportDto
{
    public int TotalDonations { get; init; }
    public decimal TotalValue { get; init; }
    public decimal AverageValue { get; init; }
    public int TotalLineItems { get; init; }

    public IReadOnlyList<CauseBreakdownDto> ByCause { get; init; } = Array.Empty<CauseBreakdownDto>();
    public IReadOnlyList<DonorBreakdownDto> ByDonor { get; init; } = Array.Empty<DonorBreakdownDto>();
    public IReadOnlyList<MonthlyTotalDto> MonthlyTrend { get; init; } = Array.Empty<MonthlyTotalDto>();
}

public record CauseBreakdownDto
{
    public int CauseId { get; init; }
    public string CauseTitle { get; init; } = string.Empty;
    public string NgoName { get; init; } = string.Empty;
    public int DonationCount { get; init; }
    public decimal TotalValue { get; init; }
    public decimal PercentOfTotal { get; init; }
}

public record DonorBreakdownDto
{
    public int DonorId { get; init; }
    public string DonorName { get; init; } = string.Empty;
    public string DonorType { get; init; } = string.Empty;
    public int DonationCount { get; init; }
    public decimal TotalValue { get; init; }
}

public record MonthlyTotalDto
{
    public string Month { get; init; } = string.Empty;   // "yyyy-MM"
    public string MonthLabel { get; init; } = string.Empty; // "Oct 2026"
    public int Count { get; init; }
    public decimal TotalValue { get; init; }
}