using KAIA.API.Services;
using KAIA.Shared.Dtos;
using Microsoft.AspNetCore.Mvc;

namespace KAIA.API.Controllers;

/// <summary>
/// CRUD endpoints for donation items. All validation is enforced via
/// DataAnnotations on the DTOs plus explicit duplicate-code checks (409).
/// </summary>
[ApiController]
[Route("api/items")]
[Produces("application/json")]
public class ItemsController : ControllerBase
{
    private readonly IItemService _items;

    public ItemsController(IItemService items) => _items = items;

    // GET /api/items
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<ItemDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<ItemDto>>> GetAll(CancellationToken ct)
    {
        var items = await _items.GetAllAsync(ct);
        return Ok(items);
    }

    // GET /api/items/{id}
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(ItemDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ItemDto>> GetById(int id, CancellationToken ct)
    {
        var item = await _items.GetByIdAsync(id, ct);
        if (item is null)
            return Problem(
                statusCode: StatusCodes.Status404NotFound,
                title: "Item not found",
                detail: $"Item {id} does not exist in the catalog.");

        return Ok(item);
    }

    // POST /api/items
    [HttpPost]
    [ProducesResponseType(typeof(ItemDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ItemDto>> Create([FromBody] CreateItemDto dto, CancellationToken ct)
    {
        if (await _items.CodeExistsAsync(dto.Code, null, ct))
            return Problem(
                statusCode: StatusCodes.Status409Conflict,
                title: "Code already in use",
                detail: $"Code '{dto.Code.ToUpperInvariant()}' is already in use. Choose a different code.");

        var created = await _items.CreateAsync(dto, ct);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    // PUT /api/items/{id}
    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(ItemDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ItemDto>> Update(int id, [FromBody] UpdateItemDto dto, CancellationToken ct)
    {
        if (await _items.CodeExistsAsync(dto.Code, id, ct))
            return Problem(
                statusCode: StatusCodes.Status409Conflict,
                title: "Code already in use",
                detail: $"Code '{dto.Code.ToUpperInvariant()}' is already in use. Choose a different code.");

        var updated = await _items.UpdateAsync(id, dto, ct);
        if (updated is null)
            return Problem(
                statusCode: StatusCodes.Status404NotFound,
                title: "Item not found",
                detail: $"Item {id} does not exist in the catalog.");

        return Ok(updated);
    }

    // DELETE /api/items/{id}
    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var ok = await _items.DeleteAsync(id, ct);
        if (!ok)
            return Problem(
                statusCode: StatusCodes.Status404NotFound,
                title: "Item not found",
                detail: $"Item {id} does not exist in the catalog.");

        return NoContent();
    }
}