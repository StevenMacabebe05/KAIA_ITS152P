using KAIA.API.Models;
using Microsoft.EntityFrameworkCore;

namespace KAIA.API.Data;

public class KaiaDbContext : DbContext
{
    public KaiaDbContext(DbContextOptions<KaiaDbContext> options) : base(options) { }

    public DbSet<Item> Items => Set<Item>();
    public DbSet<Ngo> Ngos => Set<Ngo>();
    public DbSet<Cause> Causes => Set<Cause>();
    public DbSet<Donor> Donors => Set<Donor>();
    public DbSet<Donation> Donations => Set<Donation>();
    public DbSet<DonationLine> DonationLines => Set<DonationLine>();
    public DbSet<Distribution> Distributions => Set<Distribution>();
    public DbSet<DistributionLine> DistributionLines => Set<DistributionLine>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ─── Item ──────────────────────────────────────────────────────
        modelBuilder.Entity<Item>(entity =>
        {
            entity.HasKey(i => i.Id);
            entity.Property(i => i.Name).IsRequired().HasMaxLength(100);
            entity.Property(i => i.Code).IsRequired().HasMaxLength(20);
            entity.HasIndex(i => i.Code).IsUnique();
            entity.Property(i => i.Brand).IsRequired().HasMaxLength(60);
            entity.Property(i => i.UnitPrice).HasPrecision(18, 2);
            entity.Property(i => i.CreatedAtUtc).IsRequired();
        });

        // ─── Ngo ───────────────────────────────────────────────────────
        modelBuilder.Entity<Ngo>(entity =>
        {
            entity.HasKey(n => n.Id);
            entity.Property(n => n.Name).IsRequired().HasMaxLength(120);
            entity.Property(n => n.Description).HasMaxLength(500);
            entity.Property(n => n.ContactEmail).HasMaxLength(120);
            entity.Property(n => n.ContactPhone).HasMaxLength(30);
            entity.Property(n => n.Website).HasMaxLength(200);
            entity.Property(n => n.VerificationStatus).HasConversion<int>().IsRequired();
            entity.Property(n => n.CreatedAtUtc).IsRequired();
        });

        // ─── Cause ─────────────────────────────────────────────────────
        modelBuilder.Entity<Cause>(entity =>
        {
            entity.HasKey(c => c.Id);
            entity.Property(c => c.Title).IsRequired().HasMaxLength(150);
            entity.Property(c => c.Description).HasMaxLength(1000);
            entity.Property(c => c.GoalAmount).HasPrecision(18, 2);
            entity.Property(c => c.Status).HasConversion<int>().IsRequired();
            entity.Property(c => c.Deadline).IsRequired();
            entity.Property(c => c.CreatedAtUtc).IsRequired();

            entity.HasOne(c => c.Ngo)
                  .WithMany()
                  .HasForeignKey(c => c.NgoId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(c => c.NgoId);
            entity.HasIndex(c => c.Status);
        });

        // ─── Donor ─────────────────────────────────────────────────────
        modelBuilder.Entity<Donor>(entity =>
        {
            entity.HasKey(d => d.Id);
            entity.Property(d => d.Name).IsRequired().HasMaxLength(120);
            entity.Property(d => d.Email).HasMaxLength(120);
            entity.Property(d => d.Phone).HasMaxLength(30);
            entity.Property(d => d.Type).HasConversion<int>().IsRequired();
            entity.Property(d => d.CreatedAtUtc).IsRequired();
            entity.HasIndex(d => d.Name);
            entity.HasIndex(d => d.Type);
        });

        // ─── Donation ──────────────────────────────────────────────────
        modelBuilder.Entity<Donation>(entity =>
        {
            entity.HasKey(d => d.Id);
            entity.Property(d => d.DonatedAtUtc).IsRequired();
            entity.Property(d => d.Notes).HasMaxLength(500);
            entity.Property(d => d.TotalValue).HasPrecision(18, 2);

            entity.HasMany(d => d.Lines)
                  .WithOne(l => l.Donation)
                  .HasForeignKey(l => l.DonationId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(d => d.Donor)
                  .WithMany()
                  .HasForeignKey(d => d.DonorId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(d => d.Cause)
                  .WithMany()
                  .HasForeignKey(d => d.CauseId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(d => d.DonorId);
            entity.HasIndex(d => d.CauseId);
            entity.HasIndex(d => d.DonatedAtUtc);
        });

        // ─── DonationLine ──────────────────────────────────────────────
        modelBuilder.Entity<DonationLine>(entity =>
        {
            entity.HasKey(l => l.Id);
            entity.Property(l => l.Quantity).IsRequired();
            entity.Property(l => l.UnitPriceAtTimeOfDonation).HasPrecision(18, 2);

            entity.HasOne(l => l.Item)
                  .WithMany()
                  .HasForeignKey(l => l.ItemId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(l => l.ItemId);
            entity.HasIndex(l => l.DonationId);
        });

        // ─── Distribution ──────────────────────────────────────────────
        modelBuilder.Entity<Distribution>(entity =>
        {
            entity.HasKey(d => d.Id);

            entity.Property(d => d.Recipient).IsRequired().HasMaxLength(150);
            entity.Property(d => d.Notes).HasMaxLength(500);
            entity.Property(d => d.DistributedAtUtc).IsRequired();

            entity.HasMany(d => d.Lines)
                  .WithOne(l => l.Distribution)
                  .HasForeignKey(l => l.DistributionId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(d => d.Cause)
                  .WithMany()
                  .HasForeignKey(d => d.CauseId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(d => d.CauseId);
            entity.HasIndex(d => d.DistributedAtUtc);
        });

        // ─── DistributionLine ──────────────────────────────────────────
        modelBuilder.Entity<DistributionLine>(entity =>
        {
            entity.HasKey(l => l.Id);
            entity.Property(l => l.Quantity).IsRequired();

            entity.HasOne(l => l.Item)
                  .WithMany()
                  .HasForeignKey(l => l.ItemId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(l => l.ItemId);
            entity.HasIndex(l => l.DistributionId);
        });
    }
}