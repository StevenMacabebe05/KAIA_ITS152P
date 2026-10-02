using KAIA.API.Services;
using KAIA.Shared.Dtos;
using Microsoft.AspNetCore.Mvc;

namespace KAIA.API.Controllers;

/// <summary>
/// CRUD endpoints for donors. Supports filtering by donor type
/// via the ?type= query string.
/// </summary>
[ApiController]
[Route("api/donors")]
[Produces("application/json")]
public class DonorsController : ControllerBase
{
    private readonly IDonorService _donors;

    public DonorsController(IDonorService donors) => _donors = donors;

    // GET /api/donors?type=
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<DonorDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<DonorDto>>> GetAll(
        [FromQuery] string? type,
        CancellationToken ct)
    {
        var donors = await _donors.GetAllAsync(type, ct);
        return Ok(donors);
    }

    // GET /api/donors/{id}
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(DonorDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<DonorDto>> GetById(int id, CancellationToken ct)
    {
        var donor = await _donors.GetByIdAsync(id, ct);
        if (donor is null)
            return Problem(
                statusCode: StatusCodes.Status404NotFound,
                title: "Donor not found",
                detail: $"Donor {id} does not exist.");

        return Ok(donor);
    }

    // POST /api/donors
    [HttpPost]
    [ProducesResponseType(typeof(DonorDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<DonorDto>> Create([FromBody] CreateDonorDto dto, CancellationToken ct)
    {
        var created = await _donors.CreateAsync(dto, ct);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    // PUT /api/donors/{id}
    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(DonorDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<DonorDto>> Update(int id, [FromBody] UpdateDonorDto dto, CancellationToken ct)
    {
        var updated = await _donors.UpdateAsync(id, dto, ct);
        if (updated is null)
            return Problem(
                statusCode: StatusCodes.Status404NotFound,
                title: "Donor not found",
                detail: $"Donor {id} does not exist.");

        return Ok(updated);
    }

    // DELETE /api/donors/{id}
    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        try
        {
            var ok = await _donors.DeleteAsync(id, ct);
            if (!ok)
                return Problem(
                    statusCode: StatusCodes.Status404NotFound,
                    title: "Donor not found",
                    detail: $"Donor {id} does not exist.");

            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return Problem(
                statusCode: StatusCodes.Status409Conflict,
                title: "Cannot delete donor",
                detail: ex.Message);
        }
    }

}