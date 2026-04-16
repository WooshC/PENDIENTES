using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models;

[Table("pendientes")]
public class Pendiente
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("fecha")]
    public string Fecha { get; set; } = DateTime.Now.ToString("yyyy-MM-dd");

    [Column("actividad")]
    public string Actividad { get; set; } = "Sin título";

    [Column("descripcion")]
    public string? Descripcion { get; set; }

    [Column("empresa")]
    public string? Empresa { get; set; }

    [Column("cc_emails")]
    public string? CCEmails { get; set; }

    [Column("estado")]
    public string Estado { get; set; } = "Pendiente";

    [Column("observaciones")]
    public string? Observaciones { get; set; }

    [Column("fecha_limite")]
    public string? FechaLimite { get; set; }

    [Column("email_notificacion")]
    public string? EmailNotificacion { get; set; }

    [Column("dias_antes_notificacion")]
    public int DiasAntesNotificacion { get; set; } = 3;

    [Column("audio_file_path")]
    public string? AudioFilePath { get; set; }

    [Column("audio_transcription")]
    public string? AudioTranscription { get; set; }
}

[Table("pendiente_tasks")]
public class PendienteTask
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("pendiente_id")]
    public int PendienteId { get; set; }

    [Column("description")]
    public required string Description { get; set; }

    [Column("completed")]
    public bool Completed { get; set; }

    [Column("created_at")]
    public string CreatedAt { get; set; } = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
}

[Table("clientes")]
public class Cliente
{
    [Key]
    [Column("id")]
    [System.Text.Json.Serialization.JsonPropertyName("id")]
    public int Id { get; set; }

    [Column("empresa")]
    [System.Text.Json.Serialization.JsonPropertyName("empresa")]
    public required string Empresa { get; set; }

    [Column("observaciones")]
    [System.Text.Json.Serialization.JsonPropertyName("observaciones")]
    public string? Observaciones { get; set; }

    [Column("check_estado")]
    [System.Text.Json.Serialization.JsonPropertyName("check_estado")]
    public bool CheckEstado { get; set; }

    [Column("estado")]
    [System.Text.Json.Serialization.JsonPropertyName("estado")]
    public string? Estado { get; set; } = "Pendiente";
}

[Table("client_tasks")]
public class ClientTask
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("client_id")]
    public int ClientId { get; set; }

    [Column("description")]
    public required string Description { get; set; }

    [Column("completed")]
    public bool Completed { get; set; }

    [Column("created_at")]
    public string CreatedAt { get; set; } = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
}

[Table("support_notes")]
public class SupportNote
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("title")]
    public string Title { get; set; } = "Nota sin título";

    // Ahora Content almacenará HTML: "<p>Texto <img src='/api/supportnotes/images/1'></p>"
    [Column("content")]
    public string Content { get; set; } = "";

    [Column("created_at")]
    public string CreatedAt { get; set; } = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");

    [Column("updated_at")]
    public string UpdatedAt { get; set; } = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");

    // Relación: Una nota tiene muchas imágenes
    public List<SupportNoteImage> Images { get; set; } = new();
}

[Table("support_note_images")]
public class SupportNoteImage
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("support_note_id")]
    [ForeignKey("SupportNote")]
    public int SupportNoteId { get; set; }

    [Column("file_name")]
    public string FileName { get; set; } = "";  // Nombre original: "screenshot.png"

    [Column("content_type")]
    public string ContentType { get; set; } = "image/png"; // MIME type para servir correctamente
    
    [Column("file_path")]
    public string FilePath { get; set; } = "";   // Ruta física: "/uploads/support-notes/5/abc.png"

    [Column("file_size")]
    public long FileSize { get; set; } = 0;      // Tamaño en bytes (útil para límites y backup)
    
    [Column("created_at")]
    public string CreatedAt { get; set; } = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");

    // Relación inversa (nullable para evitar ciclos JSON)
    public SupportNote? SupportNote { get; set; }
}




[Table("ai_chat_history")]
public class AiChatMessage
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("role")]
    public string Role { get; set; } = "user";

    [Column("content")]
    public string Content { get; set; } = "";

    [Column("created_at")]
    public string CreatedAt { get; set; } = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
}
