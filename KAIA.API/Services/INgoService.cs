using KAIA.Shared.Dtos;

namespace KAIA.API.Services;

public interface INgoService
{
    Task<IReadOnlyList<NgoDto>> GetAllAsync(CancellationToken ct = default);
    Task<NgoDto?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<NgoDto> CreateAsync(CreateNgoDto dto, CancellationToken ct = default);
    Task<NgoDto?> UpdateAsync(int id, UpdateNgoDto dto, CancellationToken ct = default);
    Task<NgoDto?> UpdateVerificationStatusAsync(int id, string status, CancellationToken ct = default);
    Task<bool> DeleteAsync(int id, CancellationToken ct = default);
}