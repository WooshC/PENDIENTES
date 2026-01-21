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
}
