using Backend.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text;
using System.Text.Json;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
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

    [HttpPost("ask")]
    public async Task<IActionResult> AskAi([FromBody] JsonElement body)
    {
        var apiKey = _configuration["Gemini:ApiKey"];
        if (string.IsNullOrEmpty(apiKey) || apiKey == "YOUR_GEMINI_API_KEY_HERE")
        {
            return BadRequest(new { error = "La API Key de Gemini no está configurada en el backend (appsettings.json)." });
        }

        if (!body.TryGetProperty("query", out var queryProperty))
        {
            return BadRequest(new { error = "La consulta 'query' es requerida." });
        }

        var query = queryProperty.GetString();
        
        // 1. Get all support notes to provide context
        var notes = await _context.SupportNotes.ToListAsync();
        var contextText = new StringBuilder();
        foreach (var note in notes)
        {
            contextText.AppendLine($"Fecha: {note.CreatedAt}");
            contextText.AppendLine($"Título: {note.Title}");
            contextText.AppendLine($"Contenido: {note.Content}");
            contextText.AppendLine("---");
        }

        // 2. Prepare Gemini Prompt
        // We use Gemini 1.5 Flash which is free and has a large context window
        var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={apiKey}";

        var prompt = new
        {
            contents = new[]
            {
                new
                {
                    parts = new[]
                    {
                        new { text = $"Contexto de notas de soporte:\n{contextText}\n\nPregunta del usuario: {query}" }
                    }
                }
            },
            systemInstruction = new
            {
                parts = new[]
                {
                    new { text = "Eres un asistente experto en soporte técnico. Tu tarea es responder preguntas basándote ÚNICAMENTE en las notas de soporte proporcionadas en el contexto. Reglas críticas:\n1. Si la respuesta NO está en las notas, responde: 'No he encontrado información sobre ese tema en tus notas registradas'.\n2. NO inventes soluciones, comandos o procedimientos que no estén escritos en las notas.\n3. Sé directo y útil.\n4. Si hay varias notas similares, resume la información más reciente." }
                }
            },
            generationConfig = new
            {
                temperature = 0.1, // Low temperature to reduce "imagination"
                topK = 1,
                topP = 1,
                maxOutputTokens = 1000
            }
        };

        try
        {
            var client = _httpClientFactory.CreateClient();
            var jsonPrompt = JsonSerializer.Serialize(prompt);
            var content = new StringContent(jsonPrompt, Encoding.UTF8, "application/json");

            var response = await client.PostAsync(url, content);
            var responseString = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                return StatusCode((int)response.StatusCode, new { error = "Error al conectar con Gemini", details = responseString });
            }

            using var doc = JsonDocument.Parse(responseString);
            var aiResponse = doc.RootElement
                .GetProperty("candidates")[0]
                .GetProperty("content")
                .GetProperty("parts")[0]
                .GetProperty("text")
                .GetString();

            return Ok(new { response = aiResponse });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "Error interno del servidor", details = ex.Message });
        }
    }
}
