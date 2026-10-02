using KAIA.API.Services;
using KAIA.Shared.Dtos;
using Microsoft.AspNetCore.Mvc;

namespace KAIA.API.Controllers;

/// <summary>
/// CRUD endpoints for distributions. Each distribution contains one or
/// more lines. The server validates that requested quantities do not
/// exceed the currently available stock.
/// </summary>
[ApiController]
[Route("api/distributions")]
[Produces("application/json")]
public class DistributionsController : ControllerBase
{
    private readonly IDistributionService _distributions;

    public DistributionsController(IDistributionService distributions) => _distributions = distributions;

    // GET /api/distributions?causeId=
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<DistributionDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<DistributionDto>>> GetAll(
        [FromQuery] int? causeId,
        CancellationToken ct)
    {
        var list = await _distributions.GetAllAsync(causeId, ct);
        return Ok(list);
    }

    // GET /api/distributions/{id}
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(DistributionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<DistributionDto>> GetById(int id, CancellationToken ct)
    {
        var d = await _distributions.GetByIdAsync(id, ct);
        if (d is null)
            return Problem(
                statusCode: StatusCodes.Status404NotFound,
                title: "Distribution not found",
                detail: $"Distribution {id} does not exist.");

        return Ok(d);
    }

    // POST /api/distributions
    [HttpPost]
    [ProducesResponseType(typeof(DistributionDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<DistributionDto>> Create(
        [FromBody] CreateDistributionDto dto,
        CancellationToken ct)
    {
        if (!await _distributions.CauseExistsAsync(dto.CauseId, ct))
            return Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: "Invalid cause",
                detail: $"Cause {dto.CauseId} does not exist.");

        var missing = await _distributions.FindMissingItemIdsAsync(dto.Lines.Select(l => l.ItemId), ct);
        if (missing.Count > 0)
            return Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: "Invalid item",
                detail: $"Item(s) with id(s) {string.Join(", ", missing)} do not exist.");

        try
        {
            var created = await _distributions.CreateAsync(dto, ct);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }
        catch (InvalidOperationException ex)
        {
            return Problem(
                statusCode: StatusCodes.Status409Conflict,
                title: "Insufficient stock",
                detail: ex.Message);
        }
    }

    // PUT /api/distributions/{id}
    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(DistributionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<DistributionDto>> Update(
        int id,
        [FromBody] UpdateDistributionDto dto,
        CancellationToken ct)
    {
        if (!await _distributions.CauseExistsAsync(dto.CauseId, ct))
            return Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: "Invalid cause",
                detail: $"Cause {dto.CauseId} does not exist.");

        var missing = await _distributions.FindMissingItemIdsAsync(dto.Lines.Select(l => l.ItemId), ct);
        if (missing.Count > 0)
            return Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: "Invalid item",
                detail: $"Item(s) with id(s) {string.Join(", ", missing)} do not exist.");

        try
        {
            var updated = await _distributions.UpdateAsync(id, dto, ct);
            if (updated is null)
                return Problem(
                    statusCode: StatusCodes.Status404NotFound,
                    title: "Distribution not found",
                    detail: $"Distribution {id} does not exist.");

            return Ok(updated);
        }
        catch (InvalidOperationException ex)
        {
            return Problem(
                statusCode: StatusCodes.Status409Conflict,
                title: "Insufficient stock",
                detail: ex.Message);
        }
    }

    // DELETE /api/distributions/{id}
    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var ok = await _distributions.DeleteAsync(id, ct);
        if (!ok)
            return Problem(
                statusCode: StatusCodes.Status404NotFound,
                title: "Distribution not found",
                detail: $"Distribution {id} does not exist.");

        return NoContent();
    }
}