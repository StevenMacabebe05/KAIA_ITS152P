using KAIA.API.Services;
using KAIA.Shared.Dtos;
using Microsoft.AspNetCore.Mvc;

namespace KAIA.API.Controllers;

/// <summary>
/// Read-only endpoints exposing the current stock of each item.
/// Stock is computed on the fly from donations minus distributions.
/// </summary>
[ApiController]
[Route("api/inventory")]
[Produces("application/json")]
public class InventoryController : ControllerBase
{
    private readonly IInventoryService _inventory;

    public InventoryController(IInventoryService inventory) => _inventory = inventory;

    // GET /api/inventory
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<InventoryItemDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<InventoryItemDto>>> GetAll(CancellationToken ct)
    {
        var list = await _inventory.GetAllAsync(ct);
        return Ok(list);
    }

    // GET /api/inventory/{itemId}
    [HttpGet("{itemId:int}")]
    [ProducesResponseType(typeof(InventoryItemDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<InventoryItemDto>> GetByItemId(int itemId, CancellationToken ct)
    {
        var item = await _inventory.GetByItemIdAsync(itemId, ct);
        if (item is null)
            return Problem(
                statusCode: StatusCodes.Status404NotFound,
                title: "Item not found",
                detail: $"Item {itemId} does not exist.");

        return Ok(item);
    }
}