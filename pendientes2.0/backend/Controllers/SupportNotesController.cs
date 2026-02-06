using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SupportNotesController : ControllerBase
{
    private readonly AppDbContext _context;

    public SupportNotesController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<SupportNote>>> GetSupportNotes()
    {
        return await _context.SupportNotes.OrderByDescending(n => n.CreatedAt).ToListAsync();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<SupportNote>> GetSupportNote(int id)
    {
        var note = await _context.SupportNotes.FindAsync(id);
        if (note == null) return NotFound();
        return note;
    }

    [HttpPost]
    public async Task<ActionResult<SupportNote>> CreateSupportNote(SupportNote note)
    {
        note.CreatedAt = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
        note.UpdatedAt = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
        _context.SupportNotes.Add(note);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetSupportNote), new { id = note.Id }, note);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateSupportNote(int id, SupportNote note)
    {
        if (id != note.Id) return BadRequest();

        var existing = await _context.SupportNotes.FindAsync(id);
        if (existing == null) return NotFound();

        existing.Title = note.Title;
        existing.Content = note.Content;
        existing.UpdatedAt = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");

        await _context.SaveChangesAsync();
        return Ok(new { message = "Nota actualizada" });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteSupportNote(int id)
    {
        var note = await _context.SupportNotes.FindAsync(id);
        if (note == null) return NotFound();

        _context.SupportNotes.Remove(note);
        await _context.SaveChangesAsync();
        return Ok(new { message = "Nota eliminada" });
    }
}
