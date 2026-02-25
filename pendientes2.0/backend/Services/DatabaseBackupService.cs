using Backend.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Backend.Models;

namespace Backend.Services;

public class DatabaseBackupService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<DatabaseBackupService> _logger;
    private readonly IConfiguration _configuration;

    public DatabaseBackupService(
        IServiceProvider serviceProvider,
        ILogger<DatabaseBackupService> logger,
        IConfiguration configuration)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
        _configuration = configuration;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Database Backup Service is starting.");

        while (!stoppingToken.IsCancellationRequested)
        {
            // Planificar para el próximo domingo a las 2:00 AM
            var now = DateTime.Now;
            var nextRun = now.Date.AddDays(7 - (int)now.DayOfWeek).AddHours(2);
            if (nextRun <= now)
            {
                nextRun = nextRun.AddDays(7);
            }

            var delay = nextRun - now;
            _logger.LogInformation("Próximo respaldo programado para: {NextRun}", nextRun);

            try
            {
                await Task.Delay(delay, stoppingToken);
                
                _logger.LogInformation("Iniciando respaldo semanal de la base de datos...");
                await CreateBackupAsync();
            }
            catch (TaskCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error durante el proceso de respaldo programado.");
                await Task.Delay(TimeSpan.FromHours(1), stoppingToken);
            }
        }
    }

    public async Task CreateBackupAsync()
    {
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var backupDir = Path.Combine(Directory.GetCurrentDirectory(), "Backups");
        if (!Directory.Exists(backupDir))
        {
            Directory.CreateDirectory(backupDir);
        }

        var timestamp = DateTime.Now.ToString("yyyyMMdd_HHmmss");
        var csvBackupDir = Path.Combine(backupDir, $"backup_{timestamp}");
        Directory.CreateDirectory(csvBackupDir);

        _logger.LogInformation("Generando respaldo en formato CSV (separador ;) en {Path}", csvBackupDir);

        try
        {
            // Exportar Pendientes
            var pendientes = await context.Pendientes.ToListAsync();
            await SaveToCsv(Path.Combine(csvBackupDir, "pendientes.csv"), pendientes, p => new object?[] 
            { p.Id, p.Fecha, p.Actividad, p.Descripcion, p.Empresa, p.CCEmails, p.Estado, p.Observaciones, p.FechaLimite, p.EmailNotificacion, p.DiasAntesNotificacion });

            // Exportar PendienteTasks
            var pTasks = await context.PendienteTasks.ToListAsync();
            await SaveToCsv(Path.Combine(csvBackupDir, "pendiente_tasks.csv"), pTasks, t => new object?[] 
            { t.Id, t.PendienteId, t.Description, t.Completed, t.CreatedAt });

            // Exportar Clientes
            var clientes = await context.Clientes.ToListAsync();
            await SaveToCsv(Path.Combine(csvBackupDir, "clientes.csv"), clientes, c => new object?[] 
            { c.Id, c.Empresa, c.Observaciones, c.CheckEstado, c.Estado });

            // Exportar ClientTasks
            var cTasks = await context.ClientTasks.ToListAsync();
            await SaveToCsv(Path.Combine(csvBackupDir, "client_tasks.csv"), cTasks, t => new object?[] 
            { t.Id, t.ClientId, t.Description, t.Completed, t.CreatedAt });

            // Exportar SupportNotes
            var notes = await context.SupportNotes.ToListAsync();
            await SaveToCsv(Path.Combine(csvBackupDir, "support_notes.csv"), notes, n => new object?[] 
            { n.Id, n.Title, n.Content, n.CreatedAt, n.UpdatedAt });

            _logger.LogInformation("Respaldo CSV completado exitosamente.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al generar archivos CSV.");
            throw;
        }

        // Mantener también el .bak de SQLite por seguridad si es SQLite
        var connectionString = _configuration.GetConnectionString("DefaultConnection");
        if (connectionString?.Contains(".db") == true || connectionString?.Contains("Data Source") == true)
        {
            var bakPath = Path.Combine(backupDir, $"db_full_{timestamp}.bak");
            await context.Database.ExecuteSqlRawAsync($"VACUUM INTO '{bakPath}'");
        }
    }

    private async Task SaveToCsv<T>(string filePath, List<T> data, Func<T, object?[]> selector)
    {
        if (data == null || !data.Any()) return;

        var sb = new StringBuilder();
        
        // Cabeceras (usando propiedades de la clase T)
        var properties = typeof(T).GetProperties().Select(p => p.Name);
        sb.AppendLine(string.Join(";", properties));

        foreach (var item in data)
        {
            var values = selector(item);
            var escapedValues = values.Select(v => {
                var val = v?.ToString() ?? "";
                val = val.Replace(";", ","); // Evitar conflicto con el separador
                val = val.Replace("\r", " ").Replace("\n", " "); // Evitar saltos de línea
                return val;
            });
            sb.AppendLine(string.Join(";", escapedValues));
        }

        await File.WriteAllTextAsync(filePath, sb.ToString(), Encoding.UTF8);
    }
}
