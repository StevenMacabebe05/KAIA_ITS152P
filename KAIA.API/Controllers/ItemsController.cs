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
            return NotFound(Problem($"Item {id} not found.", StatusCodes.Status404NotFound, "Not Found"));

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
            return Conflict(Problem($"Code '{dto.Code.ToUpperInvariant()}' is already in use.", StatusCodes.Status409Conflict, "Conflict"));

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
            return Conflict(Problem($"Code '{dto.Code.ToUpperInvariant()}' is already in use.", StatusCodes.Status409Conflict, "Conflict"));

        var updated = await _items.UpdateAsync(id, dto, ct);
        if (updated is null)
            return NotFound(Problem($"Item {id} not found.", StatusCodes.Status404NotFound, "Not Found"));

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
            return NotFound(Problem($"Item {id} not found.", StatusCodes.Status404NotFound, "Not Found"));

        return NoContent();
    }

    private ObjectResult Problem(string detail, int status, string title) =>
        StatusCode(status, new ProblemDetails
        {
            Status = status,
            Title = title,
            Detail = detail,
            Instance = HttpContext.Request.Path
        });
}