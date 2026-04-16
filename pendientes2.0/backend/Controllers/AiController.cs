using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Globalization;
using System.Text;
using System.Text.Json;
using System.Net.Http.Headers;

namespace Backend.Controllers;

[ApiController]
[Route("api/ai")]
public class AiController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly IHttpClientFactory _httpClientFactory;

    public AiController(AppDbContext context, IConfiguration configuration, IHttpClientFactory httpClientFactory)
    {
        _context = context;
        _configuration = configuration;
        _httpClientFactory = httpClientFactory;
    }

    private static string NormalizeText(string text)
    {
        var normalized = text.ToLowerInvariant().Normalize(NormalizationForm.FormD);
        var chars = normalized.Where(c => CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark);
        return new string(chars.ToArray());
    }

    private static List<SupportNote> FilterRelevantNotes(List<SupportNote> notes, string? query, int maxNotes, int maxContextChars)
    {
        if (string.IsNullOrWhiteSpace(query) || notes.Count == 0)
            return notes.Take(maxNotes).ToList();

        // Extract meaningful keywords (3+ chars, skip common Spanish/English stop words)
        var stopWords = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "que", "qué", "como", "cómo", "cual", "cuál", "para", "por", "con", "una", "uno",
            "los", "las", "del", "the", "and", "for", "how", "what", "when", "where", "why",
            "hay", "tiene", "esta", "esto", "este", "son", "hay", "puedo", "puede", "hacer"
        };

        var keywords = NormalizeText(query)
            .Split(new[] { ' ', ',', '.', '?', '!', ':', ';', '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries)
            .Where(w => w.Length >= 3 && !stopWords.Contains(w))
            .Distinct()
            .ToList();

        // Score each note by keyword matches in title + content
        // Uses both full keyword and a 6-char prefix (pseudo-stem) to handle verb conjugations
        // NormalizeText strips accents so "fórmulas" matches "formulas"
        var scored = notes.Select(note =>
        {
            var text = NormalizeText($"{note.Title} {note.Content}");
            var score = keywords.Count(kw =>
                text.Contains(kw) ||
                (kw.Length > 6 && text.Contains(kw[..6]))
            );
            return (note, score);
        }).ToList();

        // Take notes with matches first, then fill with most recent if needed
        var selected = scored
            .Where(x => x.score > 0)
            .OrderByDescending(x => x.score)
            .Select(x => x.note)
            .Take(maxNotes)
            .ToList();

        if (selected.Count == 0)
        {
            // No keyword match — take the most recent notes as fallback
            selected = notes.TakeLast(Math.Min(maxNotes, notes.Count)).ToList();
        }

        // Cap total context size to avoid exceeding token limits
        var result = new List<SupportNote>();
        int totalChars = 0;
        foreach (var note in selected)
        {
            var noteLen = (note.Title?.Length ?? 0) + (note.Content?.Length ?? 0) + 30;
            if (totalChars + noteLen > maxContextChars) break;
            result.Add(note);
            totalChars += noteLen;
        }

        return result;
    }

    [HttpGet("history")]
    public async Task<IActionResult> GetHistory()
    {
        var history = await _context.AiChatHistory
            .OrderBy(m => m.CreatedAt) // Assuming string sort works YYYY-MM-DD
            .ToListAsync();
        return Ok(history);
    }
    
    // Optional: Clean history
    [HttpDelete("history")]
    public async Task<IActionResult> ClearHistory()
    {
        _context.AiChatHistory.RemoveRange(_context.AiChatHistory);
        await _context.SaveChangesAsync();
        return Ok(new { message = "Historial borrado" });
    }

    [HttpPost("ask")]
    public async Task<IActionResult> AskAi([FromBody] JsonElement body)
    {
        var apiKey = _configuration["AI:ApiKey"]; 
        
        if (string.IsNullOrEmpty(apiKey) || apiKey.StartsWith("YOUR_"))
        {
            return BadRequest(new { error = "Falta la API Key en appsettings.local.json" });
        }

        if (!body.TryGetProperty("query", out var queryProperty))
        {
            return BadRequest(new { error = "La consulta 'query' es requerida." });
        }

        var query = queryProperty.GetString();

        // SAVE USER MESSAGE TO DB
        var userMsg = new AiChatMessage
        {
            Role = "user",
            Content = query,
            CreatedAt = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss")
        };
        _context.AiChatHistory.Add(userMsg);
        await _context.SaveChangesAsync();
        
        // 1. Get Support Notes Context — filtered by relevance to avoid token limits
        var allNotes = await _context.SupportNotes.ToListAsync();
        var relevantNotes = FilterRelevantNotes(allNotes, query, maxNotes: 8, maxContextChars: 6000);
        var contextText = new StringBuilder();
        foreach (var note in relevantNotes)
        {
            contextText.AppendLine($"- [{note.CreatedAt}] {note.Title}: {note.Content}");
        }

        // 2. Call Groq API (Llama 3 via OpenAI-compatible endpoint)
        var url = "https://api.groq.com/openai/v1/chat/completions";

        var requestBody = new
        {
            model = "llama-3.3-70b-versatile",
            messages = new[]
            {
                new { 
                    role = "system", 
                    content = "Eres un asistente de soporte técnico experto y útil. " +
                              "Tienes acceso a las siguientes NOTAS DE SOPORTE del usuario:\n\n" +
                              contextText.ToString() + 
                              "\n\nTU TAREA: Responde a la pregunta del usuario basándote EXCLUSIVAMENTE en la información de estas notas. " +
                              "Si la respuesta no está en las notas, di claramente que no tienes información al respecto. " +
                              "No inventes datos. Sé conciso y directo."
                },
                new { role = "user", content = query }
            },
            temperature = 0.1,
            max_tokens = 1024
        };

        try
        {
            var client = _httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

            var jsonContent = JsonSerializer.Serialize(requestBody);
            var content = new StringContent(jsonContent, Encoding.UTF8, "application/json");

            var response = await client.PostAsync(url, content);
            var responseString = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                // Save error as message? Maybe better to return UI error, but let's log it.
                Console.WriteLine($"Groq API Error: {response.StatusCode} - {responseString}");
                return StatusCode((int)response.StatusCode, new { error = "Error conectando con Groq", details = responseString });
            }

            using var doc = JsonDocument.Parse(responseString);
            var aiResponseText = doc.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString();

            // SAVE AI RESPONSE TO DB
            var aiMsg = new AiChatMessage
            {
                Role = "ai",
                Content = aiResponseText,
                CreatedAt = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss")
            };
            _context.AiChatHistory.Add(aiMsg);
            await _context.SaveChangesAsync();

            return Ok(new { response = aiResponseText });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Exception: {ex.Message}");
            return StatusCode(500, new { error = "Error interno del servidor", details = ex.Message });
        }
    }
}
