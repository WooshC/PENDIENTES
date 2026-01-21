using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ClientesController : ControllerBase
{
    private readonly AppDbContext _context;

    public ClientesController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetClientes()
    {
        // Replicating logic:
        // SELECT c.*, 
        // GROUP_CONCAT(ct.description, '|||') as task_list,
        // COUNT(ct.id) as total_tasks,
        // SUM(CASE WHEN ct.completed = 1 THEN 1 ELSE 0 END) as completed_tasks
        
        var clientes = await _context.Clientes.OrderBy(c => c.Empresa).ToListAsync();
        
        // We need to join manually or doing subqueries.
        // Efficient way in EF Core:
        var result = await _context.Clientes
            .Select(c => new 
            {
                c.Id,
                c.Empresa,
                c.Observaciones,
                c.CheckEstado, // bool
                c.Procedimiento,
                c.Estado,
                // Calculated fields
                // Note: EF Core translation for String.Join might be tricky in SQLite for GroupConcat.
                // It's easier to load data or use explicit query.
                // Let's load tasks separate or using correlated subquery logic supported by EF.
                TotalTasks = _context.ClientTasks.Count(t => t.ClientId == c.Id),
                CompletedTasks = _context.ClientTasks.Count(t => t.ClientId == c.Id && t.Completed),
                
                // For task_list string concatenation, logic inside EF LINQ is hard.
                // We'll fetch tasks locally or just skip if the frontend requests tasks in detail later.
                // The python code uses GROUP_CONCAT. The frontend likely parses this.
                // Let's do client side evaluation for the concatenation if the dataset is small (clients usually are < 1000).
                Tasks = _context.ClientTasks.Where(t => t.ClientId == c.Id && !t.Completed).Select(t => t.Description).ToList()
            })
            .ToListAsync();

        // Map to match exact Python output format if needed
        var mapped = result.Select(x => new 
        {
            id = x.Id,
            empresa = x.Empresa,
            observaciones = x.Observaciones,
            check_estado = x.CheckEstado ? 1 : 0, // Python returned integer 0/1
            procedimiento = x.Procedimiento,
            estado = x.Estado,
            total_tasks = x.TotalTasks,
            completed_tasks = x.CompletedTasks,
            task_list = string.Join("|||", x.Tasks),
            tasks = x.Tasks // Direct array for frontend convenience
        });

        return Ok(mapped);
    }

    [HttpPost]
    public async Task<ActionResult<Cliente>> AddCliente(Cliente cliente)
    {
        _context.Clientes.Add(cliente);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetClientes), new { id = cliente.Id }, new { message = "Cliente agregado" });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateCliente(int id, Cliente cliente)
    {
        if (id != cliente.Id) cliente.Id = id;

        var existing = await _context.Clientes.FindAsync(id);
        if (existing == null) return NotFound();

        existing.Empresa = cliente.Empresa;
        existing.Observaciones = cliente.Observaciones;
        existing.CheckEstado = cliente.CheckEstado;
        existing.Procedimiento = cliente.Procedimiento;
        existing.Estado = cliente.Estado;

        await _context.SaveChangesAsync();
        return Ok(new { message = "Cliente actualizado" });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteCliente(int id)
    {
        var cliente = await _context.Clientes.FindAsync(id);
        if (cliente == null) return NotFound();

        _context.Clientes.Remove(cliente);
        await _context.SaveChangesAsync();
        return Ok(new { message = "Cliente eliminado" });
    }
}
