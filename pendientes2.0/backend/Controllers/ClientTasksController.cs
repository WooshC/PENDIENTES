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
    public async Task<IActionResult> AddGlobalTask([FromBody] GlobalTaskInputModel input)
    {
        var allClients = await _context.Clientes.Select(c => c.Id).ToListAsync();
        
        // Filter out excluded IDs
        var includedIds = allClients.Except(input.ExcludedClientIds ?? new List<int>()).ToList();
        
        var tasks = includedIds.Select(cid => new ClientTask
        {
            ClientId = cid,
            Description = input.Description,
            Completed = false
        });

        _context.ClientTasks.AddRange(tasks);
        await _context.SaveChangesAsync();
        return Created("", new { message = $"Tarea global agregada a {includedIds.Count} clientes" });
    }

    [HttpPost("clients/{clientId}/create-pending-tasks")]
    public async Task<IActionResult> CreatePendingTasks(int clientId, [FromBody] CreatePendingInputModel input)
    {
        Console.WriteLine($"[DEBUG] CreatePendingTasks Payload: Email={input.Email}, Dias={input.DiasAntesNotificacion}, FechaLim={input.FechaLimite}, ClientId={clientId}");

        if (input == null)
        {
             Console.WriteLine("[DEBUG] Input model is null");
             return BadRequest(new { error = "Datos inválidos (input null)" });
        }

        if (string.IsNullOrEmpty(input.Email))
        {
            Console.WriteLine("[DEBUG] Email is missing");
            return BadRequest(new { error = "Debe especificar un correo electrónico" });
        }

        var client = await _context.Clientes.FindAsync(clientId);
        if (client == null) return NotFound(new { error = "Cliente no encontrado" });

        var pendingTasks = await _context.ClientTasks
            .Where(t => t.ClientId == clientId && !t.Completed)
            .OrderByDescending(t => t.CreatedAt) // Assuming string sort works for ISO dates
            .ToListAsync();

        if (!pendingTasks.Any())
            return BadRequest(new { error = "No hay tareas pendientes para este cliente" });

        var sb = new System.Text.StringBuilder();
        sb.AppendLine("Tareas pendientes:");

        foreach (var task in pendingTasks)
        {
            sb.AppendLine($"- {task.Description}");
        }

        var today = DateTime.Now.ToString("yyyy-MM-dd");

        var pendiente = new Pendiente
        {
            Fecha = today,
            Actividad = $"Pendientes - {client.Empresa}",
            Descripcion = sb.ToString(),
            Empresa = client.Empresa,
            Estado = "Pendiente",
            Observaciones = client.Observaciones ?? "Ninguna",
            FechaLimite = input.FechaLimite,
            EmailNotificacion = input.Email,
            DiasAntesNotificacion = input.DiasAntesNotificacion
        };
        _context.Pendientes.Add(pendiente);
        
        // We don't mark original tasks as completed here, usually? 
        // The user didn't ask to close them, but "Create Pending Tasks" implies moving them.
        // The logic previously didn't close them either (it just copied them).
        // So we keep that behavior.


        await _context.SaveChangesAsync();
        return Created("", new { message = "Pendiente generado correctamente", count = 1 });
    }
}

// Params models
public class TaskInputModel { public required string Description { get; set; } }
public class GlobalTaskInputModel 
{ 
    public required string Description { get; set; } 
    public List<int>? ExcludedClientIds { get; set; }
}
public class BulkTaskInputModel { public List<string>? Tasks { get; set; } }
public class TaskStatusInputModel { public bool Completed { get; set; } }
public class CreatePendingInputModel 
{ 
    [System.Text.Json.Serialization.JsonPropertyName("email")]
    public string? Email { get; set; } 
    [System.Text.Json.Serialization.JsonPropertyName("dias_antes_notificacion")]
    public int DiasAntesNotificacion { get; set; } = 3;
    [System.Text.Json.Serialization.JsonPropertyName("fecha_limite")]
    public string? FechaLimite { get; set; }
}
