using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Pendiente> Pendientes { get; set; }
    public DbSet<PendienteTask> PendienteTasks { get; set; }
    public DbSet<Cliente> Clientes { get; set; }
    public DbSet<ClientTask> ClientTasks { get; set; }
    public DbSet<SupportNote> SupportNotes { get; set; }
    public DbSet<AiChatMessage> AiChatHistory { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Pendiente>()
            .Property(p => p.Estado)
            .HasDefaultValue("Pendiente");
            
        modelBuilder.Entity<Pendiente>()
            .Property(p => p.DiasAntesNotificacion)
            .HasDefaultValue(3);

        modelBuilder.Entity<Cliente>()
            .Property(c => c.CheckEstado)
            .HasConversion<int>();

        modelBuilder.Entity<ClientTask>()
            .Property(t => t.Completed)
            .HasConversion<int>();

        modelBuilder.Entity<PendienteTask>()
            .Property(t => t.Completed)
            .HasConversion<int>();
    }
}
