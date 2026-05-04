using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.StaticFiles;
using System.Text.RegularExpressions;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SupportNotesController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IWebHostEnvironment _environment;
    private readonly IConfiguration _configuration;
    private readonly long _maxFileSize = 5 * 1024 * 1024; // 5MB

    public SupportNotesController(AppDbContext context, IWebHostEnvironment environment, IConfiguration configuration)
    {
        _context = context;
        _environment = environment;
        _configuration = configuration;
    }

    // GET: api/supportnotes
    [HttpGet]
    public async Task<ActionResult<IEnumerable<SupportNote>>> GetSupportNotes()
    {
        return await _context.SupportNotes
            .OrderByDescending(n => n.CreatedAt)
            .ToListAsync();
    }

    // GET: api/supportnotes/5
    [HttpGet("{id}")]
    public async Task<ActionResult<SupportNote>> GetSupportNote(int id)
    {
        var note = await _context.SupportNotes
            .Include(n => n.Images) // Incluir imágenes relacionadas
            .FirstOrDefaultAsync(n => n.Id == id);

        if (note == null) return NotFound();
        return note;
    }

    // POST: api/supportnotes
    [HttpPost]
    public async Task<ActionResult<SupportNote>> CreateSupportNote(SupportNote note)
    {
        note.CreatedAt = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
        note.UpdatedAt = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
        _context.SupportNotes.Add(note);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetSupportNote), new { id = note.Id }, note);
    }

    // PUT: api/supportnotes/5
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateSupportNote(int id, SupportNote note)
    {
        if (id != note.Id) return BadRequest();

        var existing = await _context.SupportNotes.FindAsync(id);
        if (existing == null) return NotFound();

        existing.Title = note.Title;
        // El Content ahora contiene HTML con <img src="/api/supportnotes/images/X">
        existing.Content = note.Content;
        existing.UpdatedAt = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");

        await _context.SaveChangesAsync();
        return Ok(new { message = "Nota actualizada" });
    }

    // DELETE: api/supportnotes/5
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteSupportNote(int id)
    {
        var note = await _context.SupportNotes
            .Include(n => n.Images)
            .FirstOrDefaultAsync(n => n.Id == id);

        if (note == null) return NotFound();

        // Borrar archivos físicos de imágenes antes de borrar la nota
        foreach (var image in note.Images)
        {
            var fullPath = Path.Combine(_environment.WebRootPath, image.FilePath.TrimStart('/'));
            if (System.IO.File.Exists(fullPath))
            {
                System.IO.File.Delete(fullPath);
            }
        }

        _context.SupportNotes.Remove(note);
        await _context.SaveChangesAsync();
        return Ok(new { message = "Nota y sus imágenes eliminadas" });
    }

    // POST: api/supportnotes/5/images
    // Subir imagen cuando el usuario la pega/arrastra en el editor
    [HttpPost("{noteId}/images")]
    public async Task<ActionResult<object>> UploadImage(int noteId, IFormFile file)
    {
        // Verificar que la nota existe
        var note = await _context.SupportNotes.FindAsync(noteId);
        if (note == null) return NotFound("Nota no encontrada");

        // Validaciones
        if (file == null || file.Length == 0)
            return BadRequest("No se envió archivo");

        if (file.Length > _maxFileSize)
            return BadRequest("Archivo muy grande (máx 5MB)");

        // Validar tipo de imagen
        var allowedTypes = new[] { "image/jpeg", "image/png", "image/gif", "image/webp" };
        if (!allowedTypes.Contains(file.ContentType.ToLower()))
            return BadRequest("Solo se permiten imágenes (JPEG, PNG, GIF, WebP)");

        // Crear carpeta: wwwroot/uploads/support-notes/{noteId}/
        var uploadPath = _configuration["ImageStorage:UploadPath"] ?? "uploads/support-notes";
        var uploadsFolder = Path.Combine(_environment.WebRootPath, uploadPath, noteId.ToString()); if (!Directory.Exists(uploadsFolder))
            Directory.CreateDirectory(uploadsFolder);

        // Nombre único preservando extensión
        var extension = Path.GetExtension(file.FileName).ToLower();
        var uniqueFileName = $"{Guid.NewGuid():N}{extension}";
        var uploadPath2 = _configuration["ImageStorage:UploadPath"] ?? "uploads/support-notes";
        var relativePath = $"/{uploadPath2}/{noteId}/{uniqueFileName}";
        var fullPath = Path.Combine(uploadsFolder, uniqueFileName);

        // Guardar archivo físico
        using (var stream = new FileStream(fullPath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        // Guardar en base de datos
        var image = new SupportNoteImage
        {
            SupportNoteId = noteId,
            FileName = file.FileName,
            ContentType = file.ContentType,
            FilePath = relativePath,
            FileSize = file.Length
        };

        _context.SupportNoteImages.Add(image);
        await _context.SaveChangesAsync();

        // Retornar URL que el frontend insertará como <img src="...">
        return Ok(new
        {
            id = image.Id,
            url = $"/api/supportnotes/images/{image.Id}",
            fileName = image.FileName
        });
    }

    // GET: api/supportnotes/images/5
    // Servir la imagen para mostrarla en el <img src="...">
    [HttpGet("images/{imageId}")]
    public async Task<IActionResult> GetImage(int imageId)
    {
        var image = await _context.SupportNoteImages.FindAsync(imageId);
        if (image == null) return NotFound();

        var fullPath = Path.Combine(_environment.WebRootPath, image.FilePath.TrimStart('/'));

        if (!System.IO.File.Exists(fullPath))
            return NotFound("Archivo no encontrado en disco");

        // Determinar content type
        var provider = new FileExtensionContentTypeProvider();
        if (!provider.TryGetContentType(image.FileName, out var contentType))
            contentType = image.ContentType;

        return PhysicalFile(fullPath, contentType);
    }

    // DELETE: api/supportnotes/images/5
    // Eliminar imagen específica (útil si el usuario borra una imagen del editor)
    [HttpDelete("images/{imageId}")]
    public async Task<IActionResult> DeleteImage(int imageId)
    {
        var image = await _context.SupportNoteImages.FindAsync(imageId);
        if (image == null) return NotFound();

        // Borrar archivo físico
        var fullPath = Path.Combine(_environment.WebRootPath, image.FilePath.TrimStart('/'));
        if (System.IO.File.Exists(fullPath))
        {
            System.IO.File.Delete(fullPath);
        }

        _context.SupportNoteImages.Remove(image);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Imagen eliminada" });
    }

    // GET: api/supportnotes/5/images
    // Listar todas las imágenes de una nota (útil para el frontend)
    [HttpGet("{noteId}/images")]
    public async Task<ActionResult<IEnumerable<SupportNoteImage>>> GetNoteImages(int noteId)
    {
        var images = await _context.SupportNoteImages
            .Where(i => i.SupportNoteId == noteId)
            .ToListAsync();

        return images;
    }

    // POST: api/supportnotes/5/content
    // Endpoint específico para actualizar solo el contenido HTML (con imágenes embebidas)
    [HttpPost("{id}/content")]
    public async Task<IActionResult> UpdateContent(int id, [FromBody] UpdateContentDto dto)
    {
        var note = await _context.SupportNotes.FindAsync(id);
        if (note == null) return NotFound();

        // Aquí podrías sanitizar el HTML para prevenir XSS
        note.Content = dto.Content;
        note.UpdatedAt = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");

        await _context.SaveChangesAsync();

        // Opcional: Limpiar imágenes huérfanas (que ya no aparecen en el HTML)
        await CleanOrphanImages(id, dto.Content);

        return Ok(new { message = "Contenido actualizado" });
    }

    // Método auxiliar: Eliminar imágenes que ya no están referenciadas en el HTML
    private async Task CleanOrphanImages(int noteId, string htmlContent)
    {
        var imagesInDb = await _context.SupportNoteImages
            .Where(i => i.SupportNoteId == noteId)
            .ToListAsync();

        // Extraer IDs de imágenes referenciadas en el HTML: /api/supportnotes/images/123
        var referencedIds = new List<int>();
        var matches = Regex.Matches(htmlContent ?? "", @"/api/supportnotes/images/(\d+)");
        foreach (Match match in matches)
        {
            if (int.TryParse(match.Groups[1].Value, out int id))
                referencedIds.Add(id);
        }

        // Borrar imágenes que no están en el HTML
        var orphans = imagesInDb.Where(i => !referencedIds.Contains(i.Id)).ToList();
        foreach (var orphan in orphans)
        {
            var fullPath = Path.Combine(_environment.WebRootPath, orphan.FilePath.TrimStart('/'));
            if (System.IO.File.Exists(fullPath))
                System.IO.File.Delete(fullPath);

            _context.SupportNoteImages.Remove(orphan);
        }

        if (orphans.Any())
            await _context.SaveChangesAsync();
    }
}

// DTO para actualizar contenido
public class UpdateContentDto
{
    public string Content { get; set; } = "";
}