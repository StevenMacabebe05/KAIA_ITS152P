using KAIA.API.Services;
using KAIA.Shared.Dtos;
using Microsoft.AspNetCore.Mvc;

namespace KAIA.API.Controllers;

/// <summary>
/// CRUD endpoints for causes. Causes belong to exactly one NGO
/// (via NgoId), and support filtering by NGO and by status.
/// </summary>
[ApiController]
[Route("api/causes")]
[Produces("application/json")]
public class CausesController : ControllerBase
{
    private readonly ICauseService _causes;

    public CausesController(ICauseService causes) => _causes = causes;

    // GET /api/causes?ngoId=&status=
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<CauseDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<CauseDto>>> GetAll(
        [FromQuery] int? ngoId,
        [FromQuery] string? status,
        CancellationToken ct)
    {
        var causes = await _causes.GetAllAsync(ngoId, status, ct);
        return Ok(causes);
    }

    // GET /api/causes/{id}
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(CauseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CauseDto>> GetById(int id, CancellationToken ct)
    {
        var cause = await _causes.GetByIdAsync(id, ct);
        if (cause is null)
            return Problem(
                statusCode: StatusCodes.Status404NotFound,
                title: "Cause not found",
                detail: $"Cause {id} does not exist.");

        return Ok(cause);
    }

    // POST /api/causes
    [HttpPost]
    [ProducesResponseType(typeof(CauseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<CauseDto>> Create([FromBody] CreateCauseDto dto, CancellationToken ct)
    {
        if (!await _causes.NgoExistsAsync(dto.NgoId, ct))
            return Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: "Invalid NGO",
                detail: $"NGO {dto.NgoId} does not exist.");

        if (dto.Deadline <= DateTime.UtcNow)
            return Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: "Invalid deadline",
                detail: "Deadline must be in the future.");

        var created = await _causes.CreateAsync(dto, ct);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    // PUT /api/causes/{id}
    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(CauseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CauseDto>> Update(int id, [FromBody] UpdateCauseDto dto, CancellationToken ct)
    {
        if (!await _causes.NgoExistsAsync(dto.NgoId, ct))
            return Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: "Invalid NGO",
                detail: $"NGO {dto.NgoId} does not exist.");

        var updated = await _causes.UpdateAsync(id, dto, ct);
        if (updated is null)
            return Problem(
                statusCode: StatusCodes.Status404NotFound,
                title: "Cause not found",
                detail: $"Cause {id} does not exist.");

        return Ok(updated);
    }

    // DELETE /api/causes/{id}
    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        try
        {
            var ok = await _causes.DeleteAsync(id, ct);
            if (!ok)
                return Problem(
                    statusCode: StatusCodes.Status404NotFound,
                    title: "Cause not found",
                    detail: $"Cause {id} does not exist.");

            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return Problem(
                statusCode: StatusCodes.Status409Conflict,
                title: "Cannot delete cause",
                detail: ex.Message);
        }
    }

}