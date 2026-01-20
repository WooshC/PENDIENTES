using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers;

[ApiController]
[Route("api")] 
public class ClientTasksController : ControllerBase
{
    private readonly AppDbContext _context;

    public ClientTasksController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("clients/{clientId}/tasks")]
    public async Task<IActionResult> GetClientTasks(int clientId)
    {
        var tasks = await _context.ClientTasks
            .Where(t => t.ClientId == clientId)
            .OrderByDescending(t => t.Id)
            .ToListAsync();
        return Ok(tasks);
    }

    [HttpPost("clients/{clientId}/tasks")]
    public async Task<IActionResult> AddClientTask(int clientId, [FromBody] TaskInputModel input)
    {
        var task = new ClientTask
        {
            ClientId = clientId,
            Description = input.Description,
            Completed = false
        };
        _context.ClientTasks.Add(task);
        await _context.SaveChangesAsync();
        return Created("", new { message = "Tarea agregada" });
    }

    [HttpPost("clients/{clientId}/tasks/bulk")]
    public async Task<IActionResult> AddClientTasksBulk(int clientId, [FromBody] BulkTaskInputModel input)
    {
        if (input.Tasks == null || !input.Tasks.Any()) return Ok();

        var tasks = input.Tasks.Select(desc => new ClientTask
        {
            ClientId = clientId,
            Description = desc,
            Completed = false
        });

        _context.ClientTasks.AddRange(tasks);
        await _context.SaveChangesAsync();
        return Created("", new { message = "Tareas agregadas" });
    }

    [HttpPut("tasks/{id}")]
    public async Task<IActionResult> UpdateTaskStatus(int id, [FromBody] TaskStatusInputModel input)
    {
        var task = await _context.ClientTasks.FindAsync(id);
        if (task == null) return NotFound();

        task.Completed = input.Completed;
        await _context.SaveChangesAsync();
        return Ok(new { message = "Estado actualizado" });
    }

    [HttpDelete("tasks/{id}")]
    public async Task<IActionResult> DeleteTask(int id)
    {
        var task = await _context.ClientTasks.FindAsync(id);
        if (task == null) return NotFound();

        _context.ClientTasks.Remove(task);
        await _context.SaveChangesAsync();
        return Ok(new { message = "Tarea eliminada" });
    }

    [HttpPost("tasks/global")]
    public async Task<IActionResult> AddGlobalTask([FromBody] TaskInputModel input)
    {
        var clientIds = await _context.Clientes.Select(c => c.Id).ToListAsync();
        var tasks = clientIds.Select(cid => new ClientTask
        {
            ClientId = cid,
            Description = input.Description,
            Completed = false
        });

        _context.ClientTasks.AddRange(tasks);
        await _context.SaveChangesAsync();
        return Created("", new { message = "Tarea global agregada a todos los clientes" });
    }

    [HttpPost("clients/{clientId}/create-pending-tasks")]
    public async Task<IActionResult> CreatePendingTasks(int clientId, [FromBody] CreatePendingInputModel input)
    {
        if (string.IsNullOrEmpty(input.Email))
            return BadRequest(new { error = "Debe especificar un correo electrónico" });

        var client = await _context.Clientes.FindAsync(clientId);
        if (client == null) return NotFound(new { error = "Cliente no encontrado" });

        var pendingTasks = await _context.ClientTasks
            .Where(t => t.ClientId == clientId && !t.Completed)
            .OrderByDescending(t => t.CreatedAt) // Assuming string sort works for ISO dates
            .ToListAsync();

        if (!pendingTasks.Any())
            return BadRequest(new { error = "No hay tareas pendientes para este cliente" });

        int createdCount = 0;
        var today = DateTime.Now.ToString("yyyy-MM-dd");

        foreach (var task in pendingTasks)
        {
            var pendiente = new Pendiente
            {
                Fecha = today,
                Actividad = task.Description,
                Descripcion = $"Tarea del cliente: {client.Empresa}",
                Empresa = client.Empresa,
                Estado = "Pendiente",
                Observaciones = "",
                FechaLimite = input.FechaLimite, // Can be null/empty
                EmailNotificacion = input.Email,
                DiasAntesNotificacion = input.DiasAntesNotificacion
            };
            _context.Pendientes.Add(pendiente);
            createdCount++;
        }

        await _context.SaveChangesAsync();
        return Created("", new { message = $"{createdCount} tarea(s) agregada(s) a Pendientes", count = createdCount });
    }
}

// Params models
public class TaskInputModel { public required string Description { get; set; } }
public class BulkTaskInputModel { public List<string>? Tasks { get; set; } }
public class TaskStatusInputModel { public bool Completed { get; set; } }
public class CreatePendingInputModel 
{ 
    public string? Email { get; set; } 
    [System.Text.Json.Serialization.JsonPropertyName("dias_antes_notificacion")]
    public int DiasAntesNotificacion { get; set; } = 3;
    [System.Text.Json.Serialization.JsonPropertyName("fecha_limite")]
    public string? FechaLimite { get; set; }
}
