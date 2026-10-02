using System.ComponentModel.DataAnnotations;

namespace KAIA.Shared.Dtos;

/// <summary>Payload for PUT /api/causes/{id}. Same rules as create plus status.</summary>
public class UpdateCauseDto
{
    [Required(ErrorMessage = "Select an NGO.")]
    [Range(1, int.MaxValue, ErrorMessage = "Select a valid NGO.")]
    public int NgoId { get; set; }

    [Required(ErrorMessage = "Enter the cause title.")]
    [StringLength(150, MinimumLength = 3, ErrorMessage = "Title must be 3–150 characters.")]
    public string Title { get; set; } = string.Empty;

    [StringLength(1000, ErrorMessage = "Description must be 1000 characters or less.")]
    public string? Description { get; set; }

    [Range(0.01, 99999999.99, ErrorMessage = "Goal amount must be greater than 0.")]
    public decimal GoalAmount { get; set; }

    [Required(ErrorMessage = "Choose a deadline.")]
    public DateTime Deadline { get; set; }

    /// <summary>Must be "Active", "Completed", or "Cancelled".</summary>
    [Required(ErrorMessage = "Select a status.")]
    public string Status { get; set; } = "Active";
}