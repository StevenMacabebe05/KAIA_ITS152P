using KAIA.Shared.Dtos;

namespace KAIA.API.Services;

public interface IDonorService
{
    Task<IReadOnlyList<DonorDto>> GetAllAsync(string? type = null, CancellationToken ct = default);
    Task<DonorDto?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<DonorDto> CreateAsync(CreateDonorDto dto, CancellationToken ct = default);
    Task<DonorDto?> UpdateAsync(int id, UpdateDonorDto dto, CancellationToken ct = default);
    Task<bool> DeleteAsync(int id, CancellationToken ct = default);
}