using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Globalization;
using System.Text;

namespace Backend.Controllers;

/// <summary>
/// Handles full CSV export and import for disaster recovery.
/// Export: GET  /api/database/export/{table}
/// Import: POST /api/database/import/{table}  (multipart/form-data, field "file")
/// </summary>
[ApiController]
[Route("api/database")]
public class CsvImportExportController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ILogger<CsvImportExportController> _logger;

    public CsvImportExportController(AppDbContext context, ILogger<CsvImportExportController> logger)
    {
        _context = context;
        _logger = logger;
    }

    // ── EXPORT ────────────────────────────────────────────────────────────────

    [HttpGet("export/pendientes")]
    public async Task<IActionResult> ExportPendientes()
    {
        var data = await _context.Pendientes.OrderBy(p => p.Id).ToListAsync();
        var headers = new[] { "id","fecha","actividad","descripcion","empresa","cc_emails",
                               "estado","observaciones","fecha_limite","email_notificacion",
                               "dias_antes_notificacion","audio_file_path","audio_transcription" };
        var rows = data.Select(p => new object?[]
        {
            p.Id, p.Fecha, p.Actividad, p.Descripcion, p.Empresa, p.CCEmails,
            p.Estado, p.Observaciones, p.FechaLimite, p.EmailNotificacion,
            p.DiasAntesNotificacion, p.AudioFilePath, p.AudioTranscription
        });
        return CsvFile(headers, rows, "pendientes.csv");
    }

    [HttpGet("export/pendiente_tasks")]
    public async Task<IActionResult> ExportPendienteTasks()
    {
        var data = await _context.PendienteTasks.OrderBy(t => t.Id).ToListAsync();
        var headers = new[] { "id","pendiente_id","description","completed","created_at" };
        var rows = data.Select(t => new object?[] { t.Id, t.PendienteId, t.Description, t.Completed ? 1 : 0, t.CreatedAt });
        return CsvFile(headers, rows, "pendiente_tasks.csv");
    }

    [HttpGet("export/clientes")]
    public async Task<IActionResult> ExportClientes()
    {
        var data = await _context.Clientes.OrderBy(c => c.Id).ToListAsync();
        var headers = new[] { "id","empresa","observaciones","check_estado","estado" };
        var rows = data.Select(c => new object?[] { c.Id, c.Empresa, c.Observaciones, c.CheckEstado ? 1 : 0, c.Estado });
        return CsvFile(headers, rows, "clientes.csv");
    }

    [HttpGet("export/client_tasks")]
    public async Task<IActionResult> ExportClientTasks()
    {
        var data = await _context.ClientTasks.OrderBy(t => t.Id).ToListAsync();
        var headers = new[] { "id","client_id","description","completed","created_at" };
        var rows = data.Select(t => new object?[] { t.Id, t.ClientId, t.Description, t.Completed ? 1 : 0, t.CreatedAt });
        return CsvFile(headers, rows, "client_tasks.csv");
    }

    [HttpGet("export/support_notes")]
    public async Task<IActionResult> ExportSupportNotes()
    {
        var data = await _context.SupportNotes.OrderBy(n => n.Id).ToListAsync();
        var headers = new[] { "id","title","content","created_at","updated_at" };
        var rows = data.Select(n => new object?[] { n.Id, n.Title, n.Content, n.CreatedAt, n.UpdatedAt });
        return CsvFile(headers, rows, "support_notes.csv");
    }

    [HttpGet("export/ai_chat_history")]
    public async Task<IActionResult> ExportAiChatHistory()
    {
        var data = await _context.AiChatHistory.OrderBy(m => m.Id).ToListAsync();
        var headers = new[] { "id","role","content","created_at" };
        var rows = data.Select(m => new object?[] { m.Id, m.Role, m.Content, m.CreatedAt });
        return CsvFile(headers, rows, "ai_chat_history.csv");
    }

    // ── IMPORT ────────────────────────────────────────────────────────────────

    [HttpPost("import/pendientes")]
    public async Task<IActionResult> ImportPendientes(IFormFile file)
    {
        var (headers, rows, error) = ParseCsv(file);
        if (error != null) return BadRequest(new { error });

        int inserted = 0, skipped = 0;

        foreach (var row in rows)
        {
            // Skip rows whose id already exists
            var id = GetInt(row, headers, "id");
            if (id.HasValue && await _context.Pendientes.AnyAsync(p => p.Id == id.Value))
            { skipped++; continue; }

            var p = new Pendiente
            {
                Fecha                   = GetString(row, headers, "fecha") ?? DateTime.Now.ToString("yyyy-MM-dd"),
                Actividad               = GetString(row, headers, "actividad") ?? "Sin título",
                Descripcion             = GetString(row, headers, "descripcion"),
                Empresa                 = GetString(row, headers, "empresa"),
                CCEmails                = GetString(row, headers, "cc_emails"),
                Estado                  = GetString(row, headers, "estado") ?? "Pendiente",
                Observaciones           = GetString(row, headers, "observaciones"),
                FechaLimite             = GetString(row, headers, "fecha_limite"),
                EmailNotificacion       = GetString(row, headers, "email_notificacion"),
                DiasAntesNotificacion   = GetInt(row, headers, "dias_antes_notificacion") ?? 3,
                AudioFilePath           = GetString(row, headers, "audio_file_path"),
                AudioTranscription      = GetString(row, headers, "audio_transcription"),
            };
            _context.Pendientes.Add(p);
            inserted++;
        }

        await _context.SaveChangesAsync();
        return Ok(new { inserted, skipped });
    }

    [HttpPost("import/pendiente_tasks")]
    public async Task<IActionResult> ImportPendienteTasks(IFormFile file)
    {
        var (headers, rows, error) = ParseCsv(file);
        if (error != null) return BadRequest(new { error });

        int inserted = 0, skipped = 0;

        foreach (var row in rows)
        {
            var id = GetInt(row, headers, "id");
            if (id.HasValue && await _context.PendienteTasks.AnyAsync(t => t.Id == id.Value))
            { skipped++; continue; }

            var pendienteId = GetInt(row, headers, "pendiente_id");
            if (!pendienteId.HasValue) { skipped++; continue; }

            _context.PendienteTasks.Add(new PendienteTask
            {
                PendienteId = pendienteId.Value,
                Description = GetString(row, headers, "description") ?? "",
                Completed   = GetInt(row, headers, "completed") == 1,
                CreatedAt   = GetString(row, headers, "created_at") ?? DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"),
            });
            inserted++;
        }

        await _context.SaveChangesAsync();
        return Ok(new { inserted, skipped });
    }

    [HttpPost("import/clientes")]
    public async Task<IActionResult> ImportClientes(IFormFile file)
    {
        var (headers, rows, error) = ParseCsv(file);
        if (error != null) return BadRequest(new { error });

        int inserted = 0, skipped = 0;

        foreach (var row in rows)
        {
            var id = GetInt(row, headers, "id");
            if (id.HasValue && await _context.Clientes.AnyAsync(c => c.Id == id.Value))
            { skipped++; continue; }

            _context.Clientes.Add(new Cliente
            {
                Empresa      = GetString(row, headers, "empresa") ?? "Sin nombre",
                Observaciones = GetString(row, headers, "observaciones"),
                CheckEstado  = GetInt(row, headers, "check_estado") == 1,
                Estado       = GetString(row, headers, "estado") ?? "Pendiente",
            });
            inserted++;
        }

        await _context.SaveChangesAsync();
        return Ok(new { inserted, skipped });
    }

    [HttpPost("import/client_tasks")]
    public async Task<IActionResult> ImportClientTasks(IFormFile file)
    {
        var (headers, rows, error) = ParseCsv(file);
        if (error != null) return BadRequest(new { error });

        int inserted = 0, skipped = 0;

        foreach (var row in rows)
        {
            var id = GetInt(row, headers, "id");
            if (id.HasValue && await _context.ClientTasks.AnyAsync(t => t.Id == id.Value))
            { skipped++; continue; }

            var clientId = GetInt(row, headers, "client_id");
            if (!clientId.HasValue) { skipped++; continue; }

            _context.ClientTasks.Add(new ClientTask
            {
                ClientId    = clientId.Value,
                Description = GetString(row, headers, "description") ?? "",
                Completed   = GetInt(row, headers, "completed") == 1,
                CreatedAt   = GetString(row, headers, "created_at") ?? DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"),
            });
            inserted++;
        }

        await _context.SaveChangesAsync();
        return Ok(new { inserted, skipped });
    }

    [HttpPost("import/support_notes")]
    public async Task<IActionResult> ImportSupportNotes(IFormFile file)
    {
        var (headers, rows, error) = ParseCsv(file);
        if (error != null) return BadRequest(new { error });

        int inserted = 0, skipped = 0;

        foreach (var row in rows)
        {
            var id = GetInt(row, headers, "id");
            if (id.HasValue && await _context.SupportNotes.AnyAsync(n => n.Id == id.Value))
            { skipped++; continue; }

            _context.SupportNotes.Add(new SupportNote
            {
                Title     = GetString(row, headers, "title") ?? "Nota sin título",
                Content   = GetString(row, headers, "content") ?? "",
                CreatedAt = GetString(row, headers, "created_at") ?? DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"),
                UpdatedAt = GetString(row, headers, "updated_at") ?? DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"),
            });
            inserted++;
        }

        await _context.SaveChangesAsync();
        return Ok(new { inserted, skipped });
    }

    [HttpPost("import/ai_chat_history")]
    public async Task<IActionResult> ImportAiChatHistory(IFormFile file)
    {
        var (headers, rows, error) = ParseCsv(file);
        if (error != null) return BadRequest(new { error });

        int inserted = 0, skipped = 0;

        foreach (var row in rows)
        {
            var id = GetInt(row, headers, "id");
            if (id.HasValue && await _context.AiChatHistory.AnyAsync(m => m.Id == id.Value))
            { skipped++; continue; }

            _context.AiChatHistory.Add(new AiChatMessage
            {
                Role      = GetString(row, headers, "role") ?? "user",
                Content   = GetString(row, headers, "content") ?? "",
                CreatedAt = GetString(row, headers, "created_at") ?? DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"),
            });
            inserted++;
        }

        await _context.SaveChangesAsync();
        return Ok(new { inserted, skipped });
    }

    // ── Status: list tables + row counts ─────────────────────────────────────

    [HttpGet("status")]
    public async Task<IActionResult> Status()
    {
        return Ok(new
        {
            pendientes        = await _context.Pendientes.CountAsync(),
            pendiente_tasks   = await _context.PendienteTasks.CountAsync(),
            clientes          = await _context.Clientes.CountAsync(),
            client_tasks      = await _context.ClientTasks.CountAsync(),
            support_notes     = await _context.SupportNotes.CountAsync(),
            ai_chat_history   = await _context.AiChatHistory.CountAsync(),
        });
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private IActionResult CsvFile(string[] headers, IEnumerable<object?[]> rows, string filename)
    {
        var sb = new StringBuilder();
        sb.AppendLine(string.Join(";", headers));
        foreach (var row in rows)
        {
            var cells = row.Select(v =>
            {
                var s = v?.ToString() ?? "";
                // Escape: if contains ; or " or newline, wrap in quotes
                if (s.Contains(';') || s.Contains('"') || s.Contains('\n') || s.Contains('\r'))
                    s = "\"" + s.Replace("\"", "\"\"") + "\"";
                return s;
            });
            sb.AppendLine(string.Join(";", cells));
        }
        var bytes = Encoding.UTF8.GetBytes(sb.ToString());
        return File(bytes, "text/csv; charset=utf-8", filename);
    }

    private (string[] headers, List<string[]> rows, string? error) ParseCsv(IFormFile? file)
    {
        if (file == null || file.Length == 0)
            return ([], [], "No se envió archivo.");

        using var reader = new StreamReader(file.OpenReadStream(), Encoding.UTF8);
        var lines = new List<string>();
        while (!reader.EndOfStream)
        {
            var line = reader.ReadLine();
            if (line != null) lines.Add(line);
        }

        if (lines.Count < 2)
            return ([], [], "El archivo está vacío o solo tiene cabecera.");

        var headers = SplitCsvLine(lines[0]);
        var rows = lines.Skip(1)
                        .Where(l => !string.IsNullOrWhiteSpace(l))
                        .Select(SplitCsvLine)
                        .ToList();

        return (headers, rows, null);
    }

    /// <summary>RFC 4180-ish CSV split that handles quoted fields with ; inside.</summary>
    private static string[] SplitCsvLine(string line)
    {
        var fields = new List<string>();
        var sb = new StringBuilder();
        bool inQuotes = false;

        for (int i = 0; i < line.Length; i++)
        {
            char c = line[i];
            if (inQuotes)
            {
                if (c == '"')
                {
                    if (i + 1 < line.Length && line[i + 1] == '"') { sb.Append('"'); i++; } // escaped "
                    else inQuotes = false;
                }
                else sb.Append(c);
            }
            else
            {
                if (c == '"') inQuotes = true;
                else if (c == ';') { fields.Add(sb.ToString()); sb.Clear(); }
                else sb.Append(c);
            }
        }
        fields.Add(sb.ToString());
        return fields.ToArray();
    }

    private static string? GetString(string[] row, string[] headers, string col)
    {
        var idx = Array.IndexOf(headers, col);
        if (idx < 0 || idx >= row.Length) return null;
        var v = row[idx].Trim();
        return string.IsNullOrEmpty(v) ? null : v;
    }

    private static int? GetInt(string[] row, string[] headers, string col)
    {
        var s = GetString(row, headers, col);
        return int.TryParse(s, out var n) ? n : null;
    }
}