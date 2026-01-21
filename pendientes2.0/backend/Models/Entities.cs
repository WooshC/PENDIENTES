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
    public string? FechaLimite { get; set; } // Stored as string YYYY-MM-DD

    [Column("email_notificacion")]
    public string? EmailNotificacion { get; set; }

    [Column("dias_antes_notificacion")]
    public int DiasAntesNotificacion { get; set; } = 3;
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
    
    // Navigation property not strictly needed unless we use includes, but good to have
    // public List<ClientTask> Tasks { get; set; } = new();
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
    public bool Completed { get; set; } // SQLite stores 0/1, EF handles bool automatically usually

    [Column("created_at")]
    public string CreatedAt { get; set; } = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
}
