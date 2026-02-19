using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers;

[ApiController]
[Route("api/pendientes")]
public class PendienteTasksController : ControllerBase
{
    private readonly AppDbContext _context;

    public PendienteTasksController(AppDbContext context)
    {
        _context = context;
    }

    private async Task SyncWithCliente(int pendienteId)
    {
        var pendiente = await _context.Pendientes.FindAsync(pendienteId);
        if (pendiente == null || string.IsNullOrEmpty(pendiente.Empresa)) return;

        var cliente = await _context.Clientes
            .FirstOrDefaultAsync(c => c.Empresa == pendiente.Empresa);
        if (cliente == null) return;

        // Get pending tasks from the pendiente
        var pendienteTasks = await _context.PendienteTasks
            .Where(t => t.PendienteId == pendienteId && !t.Completed)
            .ToListAsync();

        // Remove all existing client tasks and replace with current pendiente tasks
        var existingClientTasks = await _context.ClientTasks
            .Where(t => t.ClientId == cliente.Id)
            .ToListAsync();
        _context.ClientTasks.RemoveRange(existingClientTasks);

        // Add new client tasks mirroring pendiente tasks
        foreach (var pt in pendienteTasks)
        {
            _context.ClientTasks.Add(new ClientTask
            {
                ClientId = cliente.Id,
                Description = pt.Description,
                Completed = pt.Completed
            });
        }

        // Update client estado
        var totalTasks = pendienteTasks.Count;
        if (totalTasks == 0)
        {
            cliente.Estado = "Finalizado";
            cliente.CheckEstado = true;
        }
        else
        {
            cliente.Estado = "Pendiente";
            cliente.CheckEstado = false;
        }

        await _context.SaveChangesAsync();
    }

    private async Task CheckAndCompletePendiente(int pendienteId)
    {
        var tasks = await _context.PendienteTasks
            .Where(t => t.PendienteId == pendienteId)
            .ToListAsync();

        if (tasks.Count > 0 && tasks.All(t => t.Completed))
        {
            var pendiente = await _context.Pendientes.FindAsync(pendienteId);
            if (pendiente != null && pendiente.Estado != "Finalizado")
            {
                pendiente.Estado = "Finalizado";
                await _context.SaveChangesAsync();
            }
        }
    }

    [HttpGet("{pendienteId}/tasks")]
    public async Task<IActionResult> GetTasks(int pendienteId)
    {
        var tasks = await _context.PendienteTasks
            .Where(t => t.PendienteId == pendienteId)
            .OrderByDescending(t => t.Id)
            .ToListAsync();
        return Ok(tasks);
    }

    [HttpPost("{pendienteId}/tasks")]
    public async Task<IActionResult> AddTask(int pendienteId, [FromBody] PendienteTaskInput input)
    {
        var task = new PendienteTask
        {
            PendienteId = pendienteId,
            Description = input.Description,
            Completed = false
        };
        _context.PendienteTasks.Add(task);
        await _context.SaveChangesAsync();
        await SyncWithCliente(pendienteId);
        return Created("", task);
    }

    [HttpPost("{pendienteId}/tasks/bulk")]
    public async Task<IActionResult> AddTasksBulk(int pendienteId, [FromBody] BulkPendienteTaskInput input)
    {
        if (input.Tasks == null || !input.Tasks.Any()) return Ok();

        var tasks = input.Tasks.Select(desc => new PendienteTask
        {
            PendienteId = pendienteId,
            Description = desc,
            Completed = false
        });

        _context.PendienteTasks.AddRange(tasks);
        await _context.SaveChangesAsync();
        await SyncWithCliente(pendienteId);
        return Created("", new { message = "Tareas agregadas" });
    }

    [HttpPut("{pendienteId}/tasks/{taskId}")]
    public async Task<IActionResult> UpdateTask(int pendienteId, int taskId, [FromBody] PendienteTaskStatusInput input)
    {
        var task = await _context.PendienteTasks.FindAsync(taskId);
        if (task == null || task.PendienteId != pendienteId) return NotFound();

        task.Completed = input.Completed;
        task.Description = input.Description ?? task.Description;
        await _context.SaveChangesAsync();

        // If completing, remove from cliente tasks and check if all done
        if (input.Completed)
        {
            await SyncWithCliente(pendienteId);
            await CheckAndCompletePendiente(pendienteId);
        }
        else
        {
            await SyncWithCliente(pendienteId);
        }

        return Ok(task);
    }

    [HttpDelete("{pendienteId}/tasks/{taskId}")]
    public async Task<IActionResult> DeleteTask(int pendienteId, int taskId)
    {
        var task = await _context.PendienteTasks.FindAsync(taskId);
        if (task == null || task.PendienteId != pendienteId) return NotFound();

        _context.PendienteTasks.Remove(task);
        await _context.SaveChangesAsync();
        await SyncWithCliente(pendienteId);
        return Ok(new { message = "Tarea eliminada" });
    }

    // Called when user clicks "complete all" - also triggers retroalimentación flow on frontend
    [HttpPost("{pendienteId}/complete")]
    public async Task<IActionResult> CompletePendiente(int pendienteId)
    {
        var pendiente = await _context.Pendientes.FindAsync(pendienteId);
        if (pendiente == null) return NotFound();

        // Delete all tasks for this pendiente
        var tasks = await _context.PendienteTasks
            .Where(t => t.PendienteId == pendienteId)
            .ToListAsync();
        _context.PendienteTasks.RemoveRange(tasks);

        // Mark pendiente as Finalizado
        pendiente.Estado = "Finalizado";
        await _context.SaveChangesAsync();

        // Sync cliente
        if (!string.IsNullOrEmpty(pendiente.Empresa))
        {
            var cliente = await _context.Clientes
                .FirstOrDefaultAsync(c => c.Empresa == pendiente.Empresa);
            if (cliente != null)
            {
                var clientTasks = await _context.ClientTasks
                    .Where(t => t.ClientId == cliente.Id)
                    .ToListAsync();
                _context.ClientTasks.RemoveRange(clientTasks);
                cliente.CheckEstado = true;
                cliente.Estado = "Finalizado";
                await _context.SaveChangesAsync();
            }
        }

        return Ok(new { message = "Pendiente completado" });
    }
}

public class PendienteTaskInput { public required string Description { get; set; } }
public class BulkPendienteTaskInput { public List<string>? Tasks { get; set; } }
public class PendienteTaskStatusInput
{
    public bool Completed { get; set; }
    public string? Description { get; set; }
}
