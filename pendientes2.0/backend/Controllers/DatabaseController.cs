using Backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DatabaseController : ControllerBase
{
    private readonly DatabaseBackupService _backupService;

    public DatabaseController(IEnumerable<IHostedService> hostedServices)
    {
        // Recuperamos el servicio de respaldo de los servicios hospedados
        _backupService = hostedServices.OfType<DatabaseBackupService>().FirstOrDefault()!;
    }

    [HttpPost("backup")]
    public async Task<IActionResult> TriggerBackup()
    {
        if (_backupService == null)
        {
            return StatusCode(500, "Servicio de respaldo no encontrado.");
        }

        try
        {
            await _backupService.CreateBackupAsync();
            return Ok(new { message = "Respaldo iniciado correctamente. Revisa la carpeta 'Backups' en el servidor." });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error al crear el respaldo", error = ex.Message });
        }
    }
}
