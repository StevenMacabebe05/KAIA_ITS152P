using KAIA.Shared.Dtos;

namespace KAIA.API.Services;

public interface IDistributionService
{
    Task<IReadOnlyList<DistributionDto>> GetAllAsync(int? causeId = null, CancellationToken ct = default);
    Task<DistributionDto?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<DistributionDto> CreateAsync(CreateDistributionDto dto, CancellationToken ct = default);
    Task<DistributionDto?> UpdateAsync(int id, UpdateDistributionDto dto, CancellationToken ct = default);
    Task<bool> DeleteAsync(int id, CancellationToken ct = default);
    Task<bool> CauseExistsAsync(int causeId, CancellationToken ct = default);
    Task<IReadOnlyList<int>> FindMissingItemIdsAsync(IEnumerable<int> itemIds, CancellationToken ct = default);
}