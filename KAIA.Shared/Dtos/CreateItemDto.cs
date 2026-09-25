using System.ComponentModel.DataAnnotations;

namespace KAIA.Shared.Dtos;

/// <summary>Payload for POST /api/items. Validated server-side via DataAnnotations.</summary>
public class CreateItemDto
{
    [Required(ErrorMessage = "Enter an item name.")]
    [StringLength(100, MinimumLength = 2, ErrorMessage = "Name must be 2–100 characters.")]
    public string Name { get; set; } = string.Empty;

    [Required(ErrorMessage = "Enter a code.")]
    [RegularExpression(@"^[A-Z]{2}-\d{4}$", ErrorMessage = "Enter a valid code, like FD-0231.")]
    public string Code { get; set; } = string.Empty;

    [Required(ErrorMessage = "Enter a brand.")]
    [StringLength(60, MinimumLength = 1, ErrorMessage = "Brand must be 1–60 characters.")]
    public string Brand { get; set; } = string.Empty;

    [Range(0.01, 9999999.99, ErrorMessage = "Enter a price greater than 0.")]
    public decimal UnitPrice { get; set; }
}