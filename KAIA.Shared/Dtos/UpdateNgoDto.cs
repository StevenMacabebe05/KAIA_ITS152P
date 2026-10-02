using System.ComponentModel.DataAnnotations;

namespace KAIA.Shared.Dtos;

/// <summary>Payload for PUT /api/ngos/{id}. Same rules as create.</summary>
public class UpdateNgoDto
{
    [Required(ErrorMessage = "Enter the NGO name.")]
    [StringLength(120, MinimumLength = 2, ErrorMessage = "Name must be 2–120 characters.")]
    public string Name { get; set; } = string.Empty;

    [StringLength(500, ErrorMessage = "Description must be 500 characters or less.")]
    public string? Description { get; set; }

    [EmailAddress(ErrorMessage = "Enter a valid email address.")]
    [StringLength(120, ErrorMessage = "Email must be 120 characters or less.")]
    public string? ContactEmail { get; set; }

    [Phone(ErrorMessage = "Enter a valid phone number.")]
    [StringLength(30, ErrorMessage = "Phone must be 30 characters or less.")]
    public string? ContactPhone { get; set; }

    [Url(ErrorMessage = "Enter a valid URL, including https://.")]
    [StringLength(200, ErrorMessage = "Website must be 200 characters or less.")]
    public string? Website { get; set; }
}