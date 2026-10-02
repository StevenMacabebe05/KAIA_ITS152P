using KAIA.API.Services;
using KAIA.Shared.Dtos;
using Microsoft.AspNetCore.Mvc;

namespace KAIA.API.Controllers;

/// <summary>
/// CRUD endpoints for NGOs, plus a PATCH endpoint for changing the
/// verification status (Pending / Verified / Rejected).
/// </summary>
[ApiController]
[Route("api/ngos")]
[Produces("application/json")]
public class NgosController : ControllerBase
{
    private readonly INgoService _ngos;

    public NgosController(INgoService ngos) => _ngos = ngos;

    // GET /api/ngos
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<NgoDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<NgoDto>>> GetAll(CancellationToken ct)
    {
        var ngos = await _ngos.GetAllAsync(ct);
        return Ok(ngos);
    }

    // GET /api/ngos/{id}
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(NgoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<NgoDto>> GetById(int id, CancellationToken ct)
    {
        var ngo = await _ngos.GetByIdAsync(id, ct);
        if (ngo is null)
            return Problem(
                statusCode: StatusCodes.Status404NotFound,
                title: "NGO not found",
                detail: $"NGO {id} does not exist.");

        return Ok(ngo);
    }

    // POST /api/ngos
    [HttpPost]
    [ProducesResponseType(typeof(NgoDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<NgoDto>> Create([FromBody] CreateNgoDto dto, CancellationToken ct)
    {
        var created = await _ngos.CreateAsync(dto, ct);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    // PUT /api/ngos/{id}
    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(NgoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<NgoDto>> Update(int id, [FromBody] UpdateNgoDto dto, CancellationToken ct)
    {
        var updated = await _ngos.UpdateAsync(id, dto, ct);
        if (updated is null)
            return Problem(
                statusCode: StatusCodes.Status404NotFound,
                title: "NGO not found",
                detail: $"NGO {id} does not exist.");

        return Ok(updated);
    }

    // PATCH /api/ngos/{id}/verification-status
    [HttpPatch("{id:int}/verification-status")]
    [ProducesResponseType(typeof(NgoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<NgoDto>> UpdateVerificationStatus(
        int id,
        [FromBody] UpdateNgoVerificationDto dto,
        CancellationToken ct)
    {
        try
        {
            var updated = await _ngos.UpdateVerificationStatusAsync(id, dto.VerificationStatus, ct);
            if (updated is null)
                return Problem(
                    statusCode: StatusCodes.Status404NotFound,
                    title: "NGO not found",
                    detail: $"NGO {id} does not exist.");

            return Ok(updated);
        }
        catch (ArgumentException ex)
        {
            return Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: "Invalid verification status",
                detail: ex.Message);
        }
    }

    // DELETE /api/ngos/{id}
    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var ok = await _ngos.DeleteAsync(id, ct);
        if (!ok)
            return Problem(
                statusCode: StatusCodes.Status404NotFound,
                title: "NGO not found",
                detail: $"NGO {id} does not exist.");

        return NoContent();
    }
}