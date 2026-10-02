namespace KAIA.API.Models;

/// <summary>
/// Verification state of an NGO. Newly registered NGOs begin as Pending
/// and are promoted to Verified or Rejected by an administrator.
/// </summary>
public enum NgoVerificationStatus
{
    Pending = 0,
    Verified = 1,
    Rejected = 2
}