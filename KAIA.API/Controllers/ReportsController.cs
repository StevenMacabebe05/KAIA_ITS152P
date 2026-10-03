using KAIA.API.Services;
using KAIA.Shared.Dtos;
using Microsoft.AspNetCore.Mvc;

namespace KAIA.API.Controllers;

[ApiController]
[Route("api/reports")]
[Produces("application/json")]
public class ReportsController : ControllerBase
{
    private readonly IReportService _reports;

    public ReportsController(IReportService reports) => _reports = reports;

    // GET /api/reports/donations
    [HttpGet("donations")]
    [ProducesResponseType(typeof(DonationReportDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<DonationReportDto>> Donations(CancellationToken ct)
        => Ok(await _reports.GetDonationReportAsync(ct));

    // GET /api/reports/inventory
    [HttpGet("inventory")]
    [ProducesResponseType(typeof(InventoryReportDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<InventoryReportDto>> Inventory(CancellationToken ct)
        => Ok(await _reports.GetInventoryReportAsync(ct));

    // GET /api/reports/distributions
    [HttpGet("distributions")]
    [ProducesResponseType(typeof(DistributionReportDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<DistributionReportDto>> Distributions(CancellationToken ct)
        => Ok(await _reports.GetDistributionReportAsync(ct));

    // GET /api/reports/causes
    [HttpGet("causes")]
    [ProducesResponseType(typeof(IEnumerable<CauseProgressDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<CauseProgressDto>>> Causes(CancellationToken ct)
        => Ok(await _reports.GetCauseProgressAsync(ct));
}