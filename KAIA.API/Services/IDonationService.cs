using KAIA.Shared.Dtos;

namespace KAIA.API.Services;

public interface IDonationService
{
    Task<IReadOnlyList<DonationDto>> GetAllAsync(int? donorId = null, int? causeId = null, CancellationToken ct = default);
    Task<DonationDto?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<DonationDto> CreateAsync(CreateDonationDto dto, CancellationToken ct = default);
    Task<DonationDto?> UpdateAsync(int id, UpdateDonationDto dto, CancellationToken ct = default);
    Task<bool> DeleteAsync(int id, CancellationToken ct = default);
    Task<bool> DonorExistsAsync(int donorId, CancellationToken ct = default);
    Task<bool> CauseExistsAsync(int causeId, CancellationToken ct = default);
    Task<IReadOnlyList<int>> FindMissingItemIdsAsync(IEnumerable<int> itemIds, CancellationToken ct = default);
}