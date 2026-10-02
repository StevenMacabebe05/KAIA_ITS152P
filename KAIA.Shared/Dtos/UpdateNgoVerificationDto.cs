using System.ComponentModel.DataAnnotations;

namespace KAIA.Shared.Dtos;

/// <summary>Payload for PATCH /api/ngos/{id}/verification-status.</summary>
public class UpdateNgoVerificationDto
{
    /// <summary>Must be "Pending", "Verified", or "Rejected".</summary>
    [Required(ErrorMessage = "Specify the new verification status.")]
    public string VerificationStatus { get; set; } = string.Empty;
}