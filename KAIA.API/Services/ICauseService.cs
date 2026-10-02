using KAIA.Shared.Dtos;

namespace KAIA.API.Services;

public interface ICauseService
{
    Task<IReadOnlyList<CauseDto>> GetAllAsync(int? ngoId = null, string? status = null, CancellationToken ct = default);
    Task<CauseDto?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<CauseDto> CreateAsync(CreateCauseDto dto, CancellationToken ct = default);
    Task<CauseDto?> UpdateAsync(int id, UpdateCauseDto dto, CancellationToken ct = default);
    Task<bool> DeleteAsync(int id, CancellationToken ct = default);
    Task<bool> NgoExistsAsync(int ngoId, CancellationToken ct = default);
}