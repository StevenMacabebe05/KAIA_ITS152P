using System.ComponentModel.DataAnnotations;

namespace KAIA.Shared.Dtos;

/// <summary>Payload for POST /api/donations.</summary>
public class CreateDonationDto
{
    [Required(ErrorMessage = "Select a donor.")]
    [Range(1, int.MaxValue, ErrorMessage = "Select a valid donor.")]
    public int DonorId { get; set; }

    [Required(ErrorMessage = "Select a cause.")]
    [Range(1, int.MaxValue, ErrorMessage = "Select a valid cause.")]
    public int CauseId { get; set; }

    [Required(ErrorMessage = "Choose the donation date.")]
    public DateTime DonatedAtUtc { get; set; }

    [StringLength(500, ErrorMessage = "Notes must be 500 characters or less.")]
    public string? Notes { get; set; }

    [Required(ErrorMessage = "Add at least one item to the donation.")]
    [MinLength(1, ErrorMessage = "Add at least one item to the donation.")]
    public List<CreateDonationLineDto> Lines { get; set; } = new();
}

public class CreateDonationLineDto
{
    [Range(1, int.MaxValue, ErrorMessage = "Select a valid item.")]
    public int ItemId { get; set; }

    [Range(1, int.MaxValue, ErrorMessage = "Quantity must be at least 1.")]
    public int Quantity { get; set; }
}