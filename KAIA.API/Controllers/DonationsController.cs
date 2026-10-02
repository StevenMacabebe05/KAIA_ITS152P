using KAIA.API.Services;
using KAIA.Shared.Dtos;
using Microsoft.AspNetCore.Mvc;

namespace KAIA.API.Controllers;

/// <summary>
/// CRUD endpoints for donations. Each donation contains one or more
/// line items. TotalValue and per-line prices are computed server-side
/// so the client cannot falsify them.
/// </summary>
[ApiController]
[Route("api/donations")]
[Produces("application/json")]
public class DonationsController : ControllerBase
{
    private readonly IDonationService _donations;

    public DonationsController(IDonationService donations) => _donations = donations;

    // GET /api/donations?donorId=&causeId=
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<DonationDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<DonationDto>>> GetAll(
        [FromQuery] int? donorId,
        [FromQuery] int? causeId,
        CancellationToken ct)
    {
        var donations = await _donations.GetAllAsync(donorId, causeId, ct);
        return Ok(donations);
    }

    // GET /api/donations/{id}
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(DonationDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<DonationDto>> GetById(int id, CancellationToken ct)
    {
        var donation = await _donations.GetByIdAsync(id, ct);
        if (donation is null)
            return Problem(
                statusCode: StatusCodes.Status404NotFound,
                title: "Donation not found",
                detail: $"Donation {id} does not exist.");

        return Ok(donation);
    }

    // POST /api/donations
    [HttpPost]
    [ProducesResponseType(typeof(DonationDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<DonationDto>> Create([FromBody] CreateDonationDto dto, CancellationToken ct)
    {
        if (!await _donations.DonorExistsAsync(dto.DonorId, ct))
            return Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: "Invalid donor",
                detail: $"Donor {dto.DonorId} does not exist.");

        if (!await _donations.CauseExistsAsync(dto.CauseId, ct))
            return Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: "Invalid cause",
                detail: $"Cause {dto.CauseId} does not exist.");

        var missing = await _donations.FindMissingItemIdsAsync(dto.Lines.Select(l => l.ItemId), ct);
        if (missing.Count > 0)
            return Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: "Invalid item",
                detail: $"Item(s) with id(s) {string.Join(", ", missing)} do not exist.");

        var created = await _donations.CreateAsync(dto, ct);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    // PUT /api/donations/{id}
    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(DonationDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<DonationDto>> Update(int id, [FromBody] UpdateDonationDto dto, CancellationToken ct)
    {
        if (!await _donations.DonorExistsAsync(dto.DonorId, ct))
            return Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: "Invalid donor",
                detail: $"Donor {dto.DonorId} does not exist.");

        if (!await _donations.CauseExistsAsync(dto.CauseId, ct))
            return Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: "Invalid cause",
                detail: $"Cause {dto.CauseId} does not exist.");

        var missing = await _donations.FindMissingItemIdsAsync(dto.Lines.Select(l => l.ItemId), ct);
        if (missing.Count > 0)
            return Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: "Invalid item",
                detail: $"Item(s) with id(s) {string.Join(", ", missing)} do not exist.");

        var updated = await _donations.UpdateAsync(id, dto, ct);
        if (updated is null)
            return Problem(
                statusCode: StatusCodes.Status404NotFound,
                title: "Donation not found",
                detail: $"Donation {id} does not exist.");

        return Ok(updated);
    }

    // DELETE /api/donations/{id}
    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var ok = await _donations.DeleteAsync(id, ct);
        if (!ok)
            return Problem(
                statusCode: StatusCodes.Status404NotFound,
                title: "Donation not found",
                detail: $"Donation {id} does not exist.");

        return NoContent();
    }
}