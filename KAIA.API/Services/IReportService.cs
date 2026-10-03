using KAIA.Shared.Dtos;

namespace KAIA.API.Services;

public interface IReportService
{
    Task<DonationReportDto> GetDonationReportAsync(CancellationToken ct = default);
    Task<InventoryReportDto> GetInventoryReportAsync(CancellationToken ct = default);
    Task<DistributionReportDto> GetDistributionReportAsync(CancellationToken ct = default);
    Task<IReadOnlyList<CauseProgressDto>> GetCauseProgressAsync(CancellationToken ct = default);
}