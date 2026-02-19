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
    private readonly IConfiguration _configuration;

    public PendientesController(AppDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
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
        if (string.IsNullOrEmpty(pendiente.Estado)) pendiente.Estado = "Pendiente";
        _context.Pendientes.Add(pendiente);
        await _context.SaveChangesAsync();

        // If empresa is set, sync tasks to cliente
        if (!string.IsNullOrEmpty(pendiente.Empresa))
        {
            await SyncPendienteToCliente(pendiente.Id);
        }

        return CreatedAtAction(nameof(GetPendientes), new { id = pendiente.Id }, new { message = "Pendiente agregado", id = pendiente.Id });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdatePendiente(int id, Pendiente pendiente)
    {
        if (id != pendiente.Id) pendiente.Id = id;

        var existing = await _context.Pendientes.FindAsync(id);
        if (existing == null) return NotFound();

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

        // Also delete associated tasks
        var tasks = await _context.PendienteTasks
            .Where(t => t.PendienteId == id)
            .ToListAsync();
        _context.PendienteTasks.RemoveRange(tasks);

        _context.Pendientes.Remove(pendiente);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Pendiente eliminado" });
    }

    // Email link now redirects to frontend for user to manage tasks there
    [HttpGet("{id}/complete-all-tasks")]
    public IActionResult CompleteAllTasks(int id)
    {
        // Redirect to frontend page with the pendiente selected
        var baseUrl = _configuration["BaseUrl"] ?? $"{Request.Scheme}://{Request.Host}";
        // Strip backend port, redirect to frontend
        var frontendUrl = baseUrl.Replace(":5002", "").TrimEnd('/');
        return Redirect($"{frontendUrl}/?pendiente={id}");
    }

    private async Task SyncPendienteToCliente(int pendienteId)
    {
        var pendiente = await _context.Pendientes.FindAsync(pendienteId);
        if (pendiente == null || string.IsNullOrEmpty(pendiente.Empresa)) return;

        var cliente = await _context.Clientes
            .FirstOrDefaultAsync(c => c.Empresa == pendiente.Empresa);
        if (cliente == null) return;

        var pendienteTasks = await _context.PendienteTasks
            .Where(t => t.PendienteId == pendienteId && !t.Completed)
            .ToListAsync();

        // Clear client tasks and add from pendiente
        var existing = await _context.ClientTasks.Where(t => t.ClientId == cliente.Id).ToListAsync();
        _context.ClientTasks.RemoveRange(existing);

        foreach (var pt in pendienteTasks)
        {
            _context.ClientTasks.Add(new ClientTask
            {
                ClientId = cliente.Id,
                Description = pt.Description,
                Completed = false
            });
        }

        if (pendienteTasks.Count > 0)
        {
            cliente.Estado = "Pendiente";
            cliente.CheckEstado = false;
        }

        await _context.SaveChangesAsync();
    }
}
