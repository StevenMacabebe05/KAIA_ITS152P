namespace KAIA.API.Models;

/// <summary>
/// A person or organization that donates items to KAIA.
/// Referenced by Donation records (M2-5).
/// </summary>
public class Donor
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string? Email { get; set; }

    public string? Phone { get; set; }

    public DonorType Type { get; set; } = DonorType.Individual;

    public DateTime CreatedAtUtc { get; set; }
}