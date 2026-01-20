using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Pendiente> Pendientes { get; set; }
    public DbSet<Cliente> Clientes { get; set; }
    public DbSet<ClientTask> ClientTasks { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Map booleans to integers for SQLite compatibility if needed, 
        // though EF Core Sqlite provider usually handles simple bools as 0/1.
        
        // Ensure default values are respected if we generate the DB
        modelBuilder.Entity<Pendiente>()
            .Property(p => p.Estado)
            .HasDefaultValue("Pendiente");
            
        modelBuilder.Entity<Pendiente>()
            .Property(p => p.DiasAntesNotificacion)
            .HasDefaultValue(3);

        modelBuilder.Entity<Cliente>()
            .Property(c => c.CheckEstado)
            .HasConversion<int>(); // Force int storage 0/1

        modelBuilder.Entity<ClientTask>()
            .Property(t => t.Completed)
            .HasConversion<int>(); // Force int storage 0/1
    }
}
