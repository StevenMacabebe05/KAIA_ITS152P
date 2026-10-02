namespace KAIA.API.Models;

/// <summary>
/// A non-governmental organization that runs causes and receives/distributes
/// donation items. Persistence entity — never returned by the API directly.
/// </summary>
public class Ngo
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public string? ContactEmail { get; set; }

    public string? ContactPhone { get; set; }

    public string? Website { get; set; }

    public NgoVerificationStatus VerificationStatus { get; set; } = NgoVerificationStatus.Pending;

    /// <summary>Server-set on create. Never modified by clients.</summary>
    public DateTime CreatedAtUtc { get; set; }
}