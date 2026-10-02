using System.ComponentModel.DataAnnotations;

namespace KAIA.Shared.Dtos;

/// <summary>Payload for POST /api/donors.</summary>
public class CreateDonorDto
{
    [Required(ErrorMessage = "Enter the donor name.")]
    [StringLength(120, MinimumLength = 2, ErrorMessage = "Name must be 2–120 characters.")]
    public string Name { get; set; } = string.Empty;

    [EmailAddress(ErrorMessage = "Enter a valid email address.")]
    [StringLength(120, ErrorMessage = "Email must be 120 characters or less.")]
    public string? Email { get; set; }

    [Phone(ErrorMessage = "Enter a valid phone number.")]
    [StringLength(30, ErrorMessage = "Phone must be 30 characters or less.")]
    public string? Phone { get; set; }

    /// <summary>Must be "Individual" or "Organization".</summary>
    [Required(ErrorMessage = "Select a donor type.")]
    public string Type { get; set; } = "Individual";
}