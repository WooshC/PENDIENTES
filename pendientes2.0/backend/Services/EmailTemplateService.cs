namespace Backend.Services;

public interface IEmailTemplateService
{
    string GeneratePendienteNotificationEmail(int pendienteId, string actividad, string fechaLimite, string empresa, string descripcion, string observaciones, string estado, string urgency, string baseUrl);
}

public class EmailTemplateService : IEmailTemplateService
{
    public string GeneratePendienteNotificationEmail(int pendienteId, string actividad, string fechaLimite, string empresa, string descripcion, string observaciones, string estado, string urgency, string baseUrl)
    {
        // Parsing logic adaptation:
        // 1. If explicit 'observaciones' is provided, we use it. 
        // 2. We parse 'descripcion' to see if it still contains markers (legacy/mixed data).
        // 3. If 'descripcion' has no markers, we treat it as tasks.
        
        var parsed = ParseDescripcion(descripcion);

        // If we found parsed observations in description, we append/overwrite? 
        // Let's prefer the redundant internal parsing if present, or combine.
        // But usually, if key param is passed, we use it.
        string finalObservaciones = !string.IsNullOrWhiteSpace(observaciones) ? observaciones : parsed.Observaciones;
        
        // If parsing found tasks, use them. 
        // If NOT found matching "Tareas:" marker, but description has text, treat whole description as tasks.
        List<string> finalTareas = parsed.Tareas;
        if (!parsed.HasMarkers && !string.IsNullOrWhiteSpace(descripcion))
        {
             // Treat lines as tasks
             finalTareas = descripcion.Split(new[] { '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries)
                                     .Select(l => l.Trim().TrimStart('-', '•').Trim())
                                     .Where(l => !string.IsNullOrWhiteSpace(l))
                                     .ToList();
        }

        var observacionesHtml = GenerateObservacionesSection(finalObservaciones);
        var tareasHtml = GenerateTareasSection(finalTareas);
        var completeButtonHtml = GenerateCompleteButton(pendienteId, baseUrl);

        return $@"
<!DOCTYPE html>
<html lang='es'>
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <style>
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
        }}
        .email-container {{
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }}
        .header {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
        }}
        .header h1 {{
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }}
        .content {{
            padding: 30px 20px;
        }}
        .greeting {{
            font-size: 16px;
            color: #333;
            margin-bottom: 20px;
        }}
        .intro {{
            font-size: 14px;
            color: #666;
            margin-bottom: 25px;
        }}
        .activity-card {{
            background-color: #f8f9fa;
            border-left: 4px solid #667eea;
            padding: 20px;
            margin-bottom: 20px;
            border-radius: 4px;
        }}
        .activity-title {{
            font-size: 18px;
            font-weight: 600;
            color: #333;
            margin: 0 0 15px 0;
        }}
        .detail-row {{
            display: flex;
            margin-bottom: 12px;
            font-size: 14px;
        }}
        .detail-icon {{
            margin-right: 10px;
            font-size: 18px;
        }}
        .detail-label {{
            font-weight: 600;
            color: #555;
            margin-right: 8px;
        }}
        .detail-value {{
            color: #333;
        }}
        .status-badge {{
            display: inline-block;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 600;
            margin-top: 10px;
        }}
        .status-pendiente {{
            background-color: #fff3cd;
            color: #856404;
        }}
        .urgency-badge {{
            display: inline-block;
            padding: 8px 16px;
            border-radius: 4px;
            font-size: 14px;
            font-weight: 600;
            margin-top: 15px;
        }}
        .urgency-high {{
            background-color: #f8d7da;
            color: #721c24;
        }}
        .urgency-medium {{
            background-color: #fff3cd;
            color: #856404;
        }}
        .urgency-low {{
            background-color: #d1ecf1;
            color: #0c5460;
        }}
        .section-box {{
            margin: 20px 0;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid;
        }}
        .observaciones-box {{
            background-color: #e0f2fe;
            border-left-color: #0284c7;
        }}
        .observaciones-title {{
            font-size: 14px;
            font-weight: 700;
            color: #0369a1;
            margin: 0 0 10px 0;
            display: flex;
            align-items: center;
            gap: 8px;
        }}
        .observaciones-content {{
            font-size: 14px;
            color: #334155;
            line-height: 1.6;
            white-space: pre-wrap;
        }}
        .tareas-box {{
            background-color: #dcfce7;
            border-left-color: #16a34a;
        }}
        .tareas-title {{
            font-size: 14px;
            font-weight: 700;
            color: #15803d;
            margin: 0 0 10px 0;
            display: flex;
            align-items: center;
            gap: 8px;
        }}
        .task-item {{
            margin-bottom: 8px;
            font-size: 14px;
            color: #334155;
            padding-left: 20px;
            position: relative;
        }}
        .task-item:before {{
            content: '•';
            position: absolute;
            left: 0;
            color: #16a34a;
            font-weight: bold;
            font-size: 18px;
        }}
        .complete-button {{
            display: inline-block;
            margin-top: 20px;
            padding: 12px 24px;
            background-color: #16a34a;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 14px;
            text-align: center;
            transition: background-color 0.2s;
        }}
        .complete-button:hover {{
            background-color: #15803d;
        }}
        .cta-text {{
            margin-top: 20px;
            padding: 15px;
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            border-radius: 4px;
            font-size: 14px;
            color: #856404;
        }}
        .footer {{
            background-color: #f8f9fa;
            padding: 20px;
            text-align: center;
            font-size: 14px;
            color: #666;
        }}
        .footer-signature {{
            font-weight: 600;
            color: #667eea;
            margin-top: 10px;
        }}
    </style>
</head>
<body>
    <div class='email-container'>
        <div class='header'>
            <h1>🔔 Recordatorio de Pendiente</h1>
        </div>
        
        <div class='content'>
            <div class='greeting'>Hola,</div>
            
            <div class='intro'>
                Este es un recordatorio automático de tu Sistema de Pendientes.
            </div>
            
            <div class='activity-card'>
                <h2 class='activity-title'>{actividad}</h2>
                
                <div class='detail-row'>
                    <span class='detail-icon'>📅</span>
                    <span class='detail-label'>Fecha Límite:</span>
                    <span class='detail-value'>{fechaLimite}</span>
                </div>
                
                <div class='detail-row'>
                    <span class='detail-icon'>🏢</span>
                    <span class='detail-label'>Empresa:</span>
                    <span class='detail-value'>{empresa}</span>
                </div>
                
                <div>
                    <span class='status-badge status-pendiente'>⚠️ {estado}</span>
                </div>
                
                {GetUrgencyBadge(urgency)}
            </div>
            
            {observacionesHtml}
            {tareasHtml}
            
            {completeButtonHtml}
            
            <div class='cta-text'>
                ⚡ Por favor, gestiona este pendiente lo antes posible.
            </div>
        </div>
        
        <div class='footer'>
            <div>Saludos,</div>
            <div class='footer-signature'>Tu Asistente Virtual</div>
        </div>
    </div>
</body>
</html>";
    }

    private (string Observaciones, List<string> Tareas, bool HasMarkers) ParseDescripcion(string descripcion)
    {
        if (string.IsNullOrWhiteSpace(descripcion))
            return ("", new List<string>(), false);

        var observaciones = "";
        var tareas = new List<string>();

        var lines = descripcion.Split(new[] { '\n', '\r' }, StringSplitOptions.None);
        bool inObservaciones = false;
        bool inTareas = false;
        bool hasMarkers = false;

        foreach (var line in lines)
        {
            var trimmedLine = line.Trim();

            if (trimmedLine.StartsWith("Observaciones:", StringComparison.OrdinalIgnoreCase))
            {
                inObservaciones = true;
                inTareas = false;
                hasMarkers = true;
                continue;
            }
            else if (trimmedLine.StartsWith("Tareas:", StringComparison.OrdinalIgnoreCase))
            {
                inTareas = true;
                inObservaciones = false;
                hasMarkers = true;
                continue;
            }

            if (inObservaciones && !string.IsNullOrWhiteSpace(trimmedLine))
            {
                observaciones += (observaciones.Length > 0 ? "\n" : "") + trimmedLine;
            }
            else if (inTareas && !string.IsNullOrWhiteSpace(trimmedLine))
            {
                // Remove leading "- " if present
                var task = trimmedLine.StartsWith("- ") ? trimmedLine.Substring(2) : trimmedLine;
                if (!string.IsNullOrWhiteSpace(task))
                    tareas.Add(task);
            }
        }

        return (observaciones, tareas, hasMarkers);
    }

    private string GenerateObservacionesSection(string observaciones)
    {
        if (string.IsNullOrWhiteSpace(observaciones))
            return "";

        return $@"
            <div class='section-box observaciones-box'>
                <div class='observaciones-title'>
                    <span>📋</span>
                    <span>OBSERVACIONES</span>
                </div>
                <div class='observaciones-content'>{System.Net.WebUtility.HtmlEncode(observaciones)}</div>
            </div>";
    }

    private string GenerateTareasSection(List<string> tareas)
    {
        if (tareas == null || !tareas.Any())
            return "";

        var tareasHtml = string.Join("", tareas.Select(t => 
            $"<div class='task-item'>{System.Net.WebUtility.HtmlEncode(t)}</div>"));

        return $@"
            <div class='section-box tareas-box'>
                <div class='tareas-title'>
                    <span>✅</span>
                    <span>TAREAS PENDIENTES</span>
                </div>
                {tareasHtml}
            </div>";
    }

    private string GenerateCompleteButton(int pendienteId, string baseUrl)
    {
        var completeUrl = $"{baseUrl}/api/pendientes/{pendienteId}/complete-all-tasks";
        
        return $@"
            <div style='text-align: center;'>
                <a href='{completeUrl}' class='complete-button'>
                    ✓ Marcar Todas como Completadas
                </a>
            </div>";
    }

    private string GetUrgencyBadge(string urgency)
    {
        string cssClass = "urgency-low";
        
        if (urgency.Contains("hoy") || urgency.Contains("Venció"))
        {
            cssClass = "urgency-high";
        }
        else if (urgency.Contains("1 día"))
        {
            cssClass = "urgency-high";
        }
        else if (urgency.Contains("2 día") || urgency.Contains("3 día"))
        {
            cssClass = "urgency-medium";
        }
        
        return $"<div class='urgency-badge {cssClass}'>{urgency}</div>";
    }
}
