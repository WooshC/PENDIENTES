using Backend.Data;
using Backend.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Globalization;

namespace Backend.Controllers;

[ApiController]
[Route("api")]
public class NotificationsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IEmailService _emailService;

    public NotificationsController(AppDbContext context, IEmailService emailService)
    {
        _context = context;
        _emailService = emailService;
    }

    [HttpPost("notify/{id}")]
    public async Task<IActionResult> NotifyOne(int id)
    {
        var item = await _context.Pendientes.FindAsync(id);
        if (item == null) return NotFound(new { error = "Pendiente no encontrado" });
        
        if (string.IsNullOrEmpty(item.EmailNotificacion))
            return BadRequest(new { error = "No tiene correo configurado" });

        var subject = $"🔔 Recordatorio: '{item.Actividad}'";
        var body = $@"Hola,
        
Registro de pendiente:
--------------------------------------------------
ACTIVIDAD: {item.Actividad}
--------------------------------------------------
📅 Fecha Límite: {item.FechaLimite}
🏢 Empresa:      {item.Empresa}
📝 Descripción:  {item.Descripcion}
⚠️ Estado Actual: {item.Estado}
        
Saludos,
Tu Asistente Virtual";

        var success = await _emailService.SendEmailAsync(item.EmailNotificacion, subject, body);
        if (success)
            return Ok(new { message = $"Correo enviado a {item.EmailNotificacion}" });
        else
            return StatusCode(500, new { error = "Error al enviar el correo" });
    }

    [HttpPost("notifications/check-all")]
    public async Task<IActionResult> CheckAllNotifications()
    {
        // Logic from notifications.py check_deadlines_and_notify
        var today = DateTime.Today;
        
        if (today.DayOfWeek == DayOfWeek.Saturday || today.DayOfWeek == DayOfWeek.Sunday)
        {
             return Ok(new { message = "Fin de semana: No se envían notificaciones." });
        }

        var pendientes = await _context.Pendientes
            .Where(p => p.Estado == "Pendiente" && p.FechaLimite != null && p.FechaLimite != "")
            .ToListAsync();

        int sentCount = 0;

        foreach (var item in pendientes)
        {
            if (!DateTime.TryParse(item.FechaLimite, out DateTime deadline)) continue;

            // DateOnly comparison
            var daysRemaining = (deadline.Date - today).TotalDays;
            
            // Default 3 days if 0 or null logic? Model defaults to 3.
            int threshold = item.DiasAntesNotificacion;

            if (daysRemaining <= threshold && daysRemaining >= -1)
            {
                if (string.IsNullOrEmpty(item.EmailNotificacion)) continue;

                string urgency = $"Vence en {daysRemaining} días";
                if (daysRemaining == 0) urgency = "¡Vence hoy!";
                if (daysRemaining < 0) urgency = "¡Venció hace un día!";

                var subject = $"🔔 Recordatorio: '{item.Actividad}' vence pronto";
                var body = $@"
                    Hola,

                    Este es un recordatorio automático de tu Sistema de Pendientes.

                    --------------------------------------------------
                    ACTIVIDAD: {item.Actividad}
                    --------------------------------------------------
                    
                    📅 Fecha Límite: {item.FechaLimite} ({urgency})
                    🏢 Empresa:      {item.Empresa}
                    📝 Descripción:  {item.Descripcion}
                    
                    ⚠️ Estado Actual: {item.Estado}
                    
                    Por favor, gestiona este pendiente lo antes posible.

                    Saludos,
                    Tu Asistente Virtual
                    ";

                bool sent = await _emailService.SendEmailAsync(item.EmailNotificacion, subject, body);
                if (sent) sentCount++;
            }
        }

        return Ok(new { message = $"Verificación completada. Correos enviados: {sentCount}" });
    }
}
