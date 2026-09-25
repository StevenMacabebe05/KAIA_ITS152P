using KAIA.API.Models;
using Microsoft.EntityFrameworkCore;

namespace KAIA.API.Data;

/// <summary>
/// Application DbContext. In M1 it targets the EF Core InMemory provider;
/// in M3 this same class moves to SQL Server via a single provider swap in Program.cs.
/// </summary>
public class KaiaDbContext : DbContext
{
    public KaiaDbContext(DbContextOptions<KaiaDbContext> options) : base(options) { }

    public DbSet<Item> Items => Set<Item>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Item>(entity =>
        {
            entity.HasKey(i => i.Id);

            entity.Property(i => i.Name)
                  .IsRequired()
                  .HasMaxLength(100);

            entity.Property(i => i.Code)
                  .IsRequired()
                  .HasMaxLength(20);

            entity.HasIndex(i => i.Code)
                  .IsUnique();

            entity.Property(i => i.Brand)
                  .IsRequired()
                  .HasMaxLength(60);

            entity.Property(i => i.UnitPrice)
                  .HasPrecision(18, 2);

            entity.Property(i => i.CreatedAtUtc)
                  .IsRequired();
        });
    }
}