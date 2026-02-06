using Backend.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
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

    [HttpGet("test")]
    public IActionResult Test()
    {
        return Ok(new { message = "AI Controller (Groq Version) is working!" });
    }

    [HttpPost("ask")]
    public async Task<IActionResult> AskAi([FromBody] JsonElement body)
    {
        // We reuse the same config key for simplicity
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
        
        // 1. Get Support Notes Context
        var notes = await _context.SupportNotes.ToListAsync();
        var contextText = new StringBuilder();
        foreach (var note in notes)
        {
            contextText.AppendLine($"- [{note.CreatedAt:yyyy-MM-dd}] {note.Title}: {note.Content}");
        }

        // 2. Call Groq API (Llama 3 via OpenAI-compatible endpoint)
        // Docs: https://console.groq.com/docs/openai
        var url = "https://api.groq.com/openai/v1/chat/completions";

        var requestBody = new
        {
            model = "llama-3.3-70b-versatile", // Updated to Llama 3.3 (Current Stable)
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
            temperature = 0.1, // Low creativity/hallucination
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
                Console.WriteLine($"Groq API Error: {response.StatusCode} - {responseString}");
                return StatusCode((int)response.StatusCode, new { error = "Error conectando con Groq", details = responseString });
            }

            using var doc = JsonDocument.Parse(responseString);
            var aiResponse = doc.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString();

            return Ok(new { response = aiResponse });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Exception: {ex.Message}");
            return StatusCode(500, new { error = "Error interno del servidor", details = ex.Message });
        }
    }
}
