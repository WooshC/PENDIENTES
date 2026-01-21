using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PendientesController : ControllerBase
{
    private readonly AppDbContext _context;

    public PendientesController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Pendiente>>> GetPendientes()
    {
        return await _context.Pendientes
            .OrderBy(p => p.FechaLimite)
            .ToListAsync();
    }

    [HttpPost]
    public async Task<ActionResult<Pendiente>> AddPendiente(Pendiente pendiente)
    {
        // Python code handles defaults, but our model has them.
        // We might need to ensure 'estado' is set if null, but it has default initializer.
        if (string.IsNullOrEmpty(pendiente.Estado)) pendiente.Estado = "Pendiente";
        
        _context.Pendientes.Add(pendiente);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetPendientes), new { id = pendiente.Id }, new { message = "Pendiente agregado" });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdatePendiente(int id, Pendiente pendiente)
    {
        if (id != pendiente.Id)
        {
            // If API caller sends ID in URL but not body, or mismatch
             pendiente.Id = id;
        }

        var existing = await _context.Pendientes.FindAsync(id);
        if (existing == null) return NotFound();

        // Update fields
        existing.Fecha = pendiente.Fecha;
        existing.Actividad = pendiente.Actividad;
        existing.Descripcion = pendiente.Descripcion;
        existing.Empresa = pendiente.Empresa;
        existing.CCEmails = pendiente.CCEmails;
        existing.Estado = pendiente.Estado;
        existing.Observaciones = pendiente.Observaciones;
        existing.FechaLimite = pendiente.FechaLimite;
        existing.EmailNotificacion = pendiente.EmailNotificacion;
        existing.DiasAntesNotificacion = pendiente.DiasAntesNotificacion;

        await _context.SaveChangesAsync();

        return Ok(new { message = "Pendiente actualizado" });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeletePendiente(int id)
    {
        var pendiente = await _context.Pendientes.FindAsync(id);
        if (pendiente == null) return NotFound();

        _context.Pendientes.Remove(pendiente);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Pendiente eliminado" });
    }

    [HttpGet("{id}/complete-all-tasks")]
    public async Task<IActionResult> CompleteAllTasks(int id)
    {
        var pendiente = await _context.Pendientes.FindAsync(id);
        if (pendiente == null) 
            return Content(GenerateErrorPage("Pendiente no encontrado"), "text/html");

        // 1. Mark pendiente as Finalizado
        pendiente.Estado = "Finalizado";

        // 2. Find client by empresa name and mark as completed
        var client = await _context.Clientes
            .FirstOrDefaultAsync(c => c.Empresa == pendiente.Empresa);
        
        if (client != null)
        {
            client.CheckEstado = true;
            
            // 3. Delete all tasks for this client
            var clientTasks = await _context.ClientTasks
                .Where(t => t.ClientId == client.Id)
                .ToListAsync();
            
            _context.ClientTasks.RemoveRange(clientTasks);
        }

        await _context.SaveChangesAsync();

        return Content(GenerateSuccessPage(pendiente.Actividad), "text/html");
    }

    private string GenerateSuccessPage(string actividad)
    {
        return $@"
<!DOCTYPE html>
<html lang='es'>
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>Tareas Completadas</title>
    <style>
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }}
        .container {{
            background: white;
            border-radius: 16px;
            padding: 40px;
            max-width: 500px;
            text-align: center;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        }}
        .success-icon {{
            font-size: 64px;
            margin-bottom: 20px;
        }}
        h1 {{
            color: #16a34a;
            margin: 0 0 10px 0;
            font-size: 28px;
        }}
        p {{
            color: #64748b;
            font-size: 16px;
            line-height: 1.6;
            margin: 20px 0;
        }}
        .activity {{
            background: #f1f5f9;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            font-weight: 600;
            color: #334155;
        }}
        .info {{
            background: #dcfce7;
            border-left: 4px solid #16a34a;
            padding: 15px;
            border-radius: 4px;
            text-align: left;
            margin: 20px 0;
            font-size: 14px;
            color: #15803d;
        }}
    </style>
</head>
<body>
    <div class='container'>
        <div class='success-icon'>✅</div>
        <h1>¡Tareas Completadas!</h1>
        <p>Has marcado todas las tareas como completadas exitosamente.</p>
        <div class='activity'>{System.Net.WebUtility.HtmlEncode(actividad)}</div>
        <div class='info'>
            <strong>✓ Pendiente:</strong> Marcado como Finalizado<br>
            <strong>✓ Cliente:</strong> Actualizado a completado<br>
            <strong>✓ Tareas:</strong> Eliminadas del sistema
        </div>
        <p style='font-size: 14px; color: #94a3b8;'>Puedes cerrar esta ventana.</p>
    </div>
</body>
</html>";
    }

    private string GenerateErrorPage(string error)
    {
        return $@"
<!DOCTYPE html>
<html lang='es'>
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>Error</title>
    <style>
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }}
        .container {{
            background: white;
            border-radius: 16px;
            padding: 40px;
            max-width: 500px;
            text-align: center;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        }}
        .error-icon {{
            font-size: 64px;
            margin-bottom: 20px;
        }}
        h1 {{
            color: #dc2626;
            margin: 0 0 10px 0;
            font-size: 28px;
        }}
        p {{
            color: #64748b;
            font-size: 16px;
            line-height: 1.6;
        }}
    </style>
</head>
<body>
    <div class='container'>
        <div class='error-icon'>❌</div>
        <h1>Error</h1>
        <p>{System.Net.WebUtility.HtmlEncode(error)}</p>
    </div>
</body>
</html>";
    }
}
