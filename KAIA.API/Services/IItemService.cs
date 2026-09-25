using KAIA.Shared.Dtos;

namespace KAIA.API.Services;

public interface IItemService
{
    Task<IReadOnlyList<ItemDto>> GetAllAsync(CancellationToken ct = default);
    Task<ItemDto?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<ItemDto> CreateAsync(CreateItemDto dto, CancellationToken ct = default);
    Task<ItemDto?> UpdateAsync(int id, UpdateItemDto dto, CancellationToken ct = default);
    Task<bool> DeleteAsync(int id, CancellationToken ct = default);
    Task<bool> CodeExistsAsync(string code, int? excludeId = null, CancellationToken ct = default);
}