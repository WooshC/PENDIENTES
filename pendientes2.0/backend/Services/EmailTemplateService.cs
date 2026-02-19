namespace Backend.Services;

using Backend.Models;

public interface IEmailTemplateService
{
    string GeneratePendienteNotificationEmail(int pendienteId, string actividad, string fechaLimite, string empresa, string descripcion, string observaciones, string estado, string urgency, string baseUrl, List<PendienteTask>? tasks = null);
}

public class EmailTemplateService : IEmailTemplateService
{
    public string GeneratePendienteNotificationEmail(int pendienteId, string actividad, string fechaLimite, string empresa, string descripcion, string observaciones, string estado, string urgency, string baseUrl, List<PendienteTask>? tasks = null)
    {
        var tareasHtml = GenerateTareasSection(descripcion, tasks);
        var buttonHtml = GenerateViewButton(pendienteId, baseUrl);

        return $@"
<!DOCTYPE html>
<html lang='es'>
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <style>
        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }}
        .email-container {{ max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }}
        .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; }}
        .header h1 {{ margin: 0; font-size: 24px; font-weight: 600; }}
        .content {{ padding: 30px 20px; }}
        .activity-card {{ background-color: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; margin-bottom: 20px; border-radius: 4px; }}
        .activity-title {{ font-size: 18px; font-weight: 600; color: #333; margin: 0 0 15px 0; }}
        .detail-row {{ display: flex; margin-bottom: 12px; font-size: 14px; }}
        .detail-icon {{ margin-right: 10px; font-size: 18px; }}
        .detail-label {{ font-weight: 600; color: #555; margin-right: 8px; }}
        .detail-value {{ color: #333; }}
        .status-badge {{ display: inline-block; padding: 6px 12px; border-radius: 20px; font-size: 13px; font-weight: 600; background-color: #fff3cd; color: #856404; }}
        .urgency-badge {{ display: inline-block; padding: 8px 16px; border-radius: 4px; font-size: 14px; font-weight: 600; margin-top: 15px; }}
        .urgency-high {{ background-color: #f8d7da; color: #721c24; }}
        .urgency-medium {{ background-color: #fff3cd; color: #856404; }}
        .urgency-low {{ background-color: #d1ecf1; color: #0c5460; }}
        .section-box {{ margin: 20px 0; padding: 15px; border-radius: 8px; border-left: 4px solid; }}
        .observaciones-box {{ background-color: #e0f2fe; border-left-color: #0284c7; }}
        .observaciones-title {{ font-size: 14px; font-weight: 700; color: #0369a1; margin: 0 0 10px 0; }}
        .observaciones-content {{ font-size: 14px; color: #334155; line-height: 1.6; white-space: pre-wrap; }}
        .tareas-box {{ background-color: #dcfce7; border-left-color: #16a34a; }}
        .tareas-title {{ font-size: 14px; font-weight: 700; color: #15803d; margin: 0 0 10px 0; }}
        .task-item {{ margin-bottom: 8px; font-size: 14px; color: #334155; padding-left: 20px; position: relative; }}
        .task-item:before {{ content: ''; display: none; }}
        .task-item-bullet {{ padding-left: 20px; position: relative; }}
        .task-item-bullet:before {{ content: '•'; position: absolute; left: 0; color: #16a34a; font-weight: bold; font-size: 18px; display: block; }}
        .view-button {{ display: inline-block; margin-top: 20px; padding: 14px 28px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 15px; text-align: center; }}
        .cta-text {{ margin-top: 20px; padding: 15px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px; font-size: 14px; color: #856404; }}
        .footer {{ background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #666; }}
        .footer-signature {{ font-weight: 600; color: #667eea; margin-top: 10px; }}
    </style>
</head>
<body>
    <div class='email-container'>
        <div class='header'><h1>🔔 Recordatorio de Pendiente</h1></div>
        <div class='content'>
            <div style='font-size:16px;color:#333;margin-bottom:20px;'>Hola,</div>
            <div style='font-size:14px;color:#666;margin-bottom:25px;'>Este es un recordatorio automático de tu Sistema de Pendientes.</div>
            <div class='activity-card'>
                <h2 class='activity-title'>{System.Net.WebUtility.HtmlEncode(actividad)}</h2>
                <div class='detail-row'><span class='detail-icon'>📅</span><span class='detail-label'>Fecha Límite:</span><span class='detail-value'>{System.Net.WebUtility.HtmlEncode(fechaLimite)}</span></div>
                <div class='detail-row'><span class='detail-icon'>🏢</span><span class='detail-label'>Empresa:</span><span class='detail-value'>{System.Net.WebUtility.HtmlEncode(empresa)}</span></div>
                <div><span class='status-badge'>⚠️ {System.Net.WebUtility.HtmlEncode(estado)}</span></div>
                {GetUrgencyBadge(urgency)}
            </div>
            {observacionesHtml}
            {tareasHtml}
            {buttonHtml}
            <div class='cta-text'>⚡ Por favor, gestiona este pendiente lo antes posible.</div>
        </div>
        <div class='footer'>
            <div>Saludos,</div>
            <div class='footer-signature'>Tu Asistente Virtual</div>
        </div>
    </div>
</body>
</html>";
    }

    private List<string> ParseTareas(string descripcion)
    {
        if (string.IsNullOrWhiteSpace(descripcion)) return new List<string>();
        return descripcion.Split(new[] { '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries)
            .Select(l => l.Trim().TrimStart('-', '•').Trim())
            .Where(l => !string.IsNullOrWhiteSpace(l))
            .ToList();
    }

    private string GenerateObservacionesSection(string observaciones)
    {
        if (string.IsNullOrWhiteSpace(observaciones)) return "";
        return $@"
            <div class='section-box observaciones-box'>
                <div class='observaciones-title'>📋 OBSERVACIONES</div>
                <div class='observaciones-content'>{System.Net.WebUtility.HtmlEncode(observaciones)}</div>
            </div>";
    }

    private string GenerateTareasSection(string descripcion, List<PendienteTask>? tasks)
    {
        string itemsHtml = "";

        if (tasks != null && tasks.Any())
        {
            var items = tasks.Select(t =>
            {
                var icon = t.Completed ? "✅" : "⬜"; // Checked vs Empty Square
                var style = t.Completed ? "text-decoration: line-through; color: #888;" : "color: #334155;";
                return $"<div class='task-item' style='{style}'><span style='margin-right:8px;'>{icon}</span>{System.Net.WebUtility.HtmlEncode(t.Description)}</div>";
            });
            itemsHtml = string.Join("", items);
        }
        else
        {
            var listaTareas = ParseTareas(descripcion);
            if (!listaTareas.Any()) return "";
            itemsHtml = string.Join("", listaTareas.Select(t =>
                $"<div class='task-item task-item-bullet'>{System.Net.WebUtility.HtmlEncode(t)}</div>"));
        }

        return $@"
            <div class='section-box tareas-box'>
                <div class='tareas-title'>✅ TAREAS PENDIENTES</div>
                {itemsHtml}
            </div>";
    }

    private string GenerateViewButton(int pendienteId, string baseUrl)
    {
        // Link to frontend - user manages tasks in the app
        var frontendUrl = baseUrl.TrimEnd('/');
        var viewUrl = $"{frontendUrl}/?pendiente={pendienteId}";
        return $@"
            <div style='text-align: center; margin-top: 20px;'>
                <a href='{viewUrl}' class='view-button'>📋 Abrir y Gestionar Tareas</a>
                <p style='font-size:12px;color:#94a3b8;margin-top:8px;'>Haz clic para ver y completar las tareas en el sistema</p>
            </div>";
    }

    private string GetUrgencyBadge(string urgency)
    {
        string cssClass = "urgency-low";
        if (urgency.Contains("hoy") || urgency.Contains("Venció")) cssClass = "urgency-high";
        else if (urgency.Contains("1 día")) cssClass = "urgency-high";
        else if (urgency.Contains("2 día") || urgency.Contains("3 día")) cssClass = "urgency-medium";
        return $"<div class='urgency-badge {cssClass}'>{System.Net.WebUtility.HtmlEncode(urgency)}</div>";
    }
}
