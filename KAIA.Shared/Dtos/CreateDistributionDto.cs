using System.ComponentModel.DataAnnotations;

namespace KAIA.Shared.Dtos;

/// <summary>Payload for POST /api/distributions.</summary>
public class CreateDistributionDto
{
    [Required(ErrorMessage = "Select a cause.")]
    [Range(1, int.MaxValue, ErrorMessage = "Select a valid cause.")]
    public int CauseId { get; set; }

    [Required(ErrorMessage = "Choose the distribution date.")]
    public DateTime DistributedAtUtc { get; set; }

    [Required(ErrorMessage = "Enter the recipient.")]
    [StringLength(150, MinimumLength = 2, ErrorMessage = "Recipient must be 2–150 characters.")]
    public string Recipient { get; set; } = string.Empty;

    [StringLength(500, ErrorMessage = "Notes must be 500 characters or less.")]
    public string? Notes { get; set; }

    [Required(ErrorMessage = "Add at least one item to the distribution.")]
    [MinLength(1, ErrorMessage = "Add at least one item to the distribution.")]
    public List<CreateDistributionLineDto> Lines { get; set; } = new();
}

public class CreateDistributionLineDto
{
    [Range(1, int.MaxValue, ErrorMessage = "Select a valid item.")]
    public int ItemId { get; set; }

    [Range(1, int.MaxValue, ErrorMessage = "Quantity must be at least 1.")]
    public int Quantity { get; set; }
}