
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import database
from datetime import datetime, date, timedelta

# CONFIGURACIÓN DEL SERVIDOR DE CORREO
# Reemplazar con credenciales reales o usar variables de entorno
SMTP_SERVER = 'smtp.gmail.com' # Ejemplo Gmail
SMTP_PORT = 587
SENDER_EMAIL = 'moisesisraelarequipam@gmail.com'
SENDER_PASSWORD = 'idnnypaydmygazny' 

def send_email(to_email, subject, body):
    try:
        msg = MIMEMultipart()
        msg['From'] = SENDER_EMAIL
        msg['To'] = to_email
        msg['Subject'] = subject

        msg.attach(MIMEText(body, 'plain'))

        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        text = msg.as_string()
        server.sendmail(SENDER_EMAIL, to_email, text)
        server.quit()
        print(f"Correo enviado a {to_email}")
        return True
    except Exception as e:
        print(f"Error enviando correo: {e}")
        return False

def check_deadlines_and_notify():
    # Bloquear notificaciones en fines de semana (Sábado=5, Domingo=6)
    if datetime.today().weekday() >= 5:
        print("Fin de semana: No se envían notificaciones.")
        return

    pendientes = database.get_pendientes()
    today = date.today()
    
    print(f"Chequeando notificaciones para fecha actual: {today}")

    for item in pendientes:
        if item['estado'] == 'Pendiente' and item['fecha_limite']:
            deadline_str = item['fecha_limite']
            try:
                deadline = datetime.strptime(deadline_str, '%Y-%m-%d').date()
            except ValueError:
                continue # Fecha inválida

            # Calcular días restantes
            days_remaining = (deadline - today).days

            # Lógica Personalizada: Usar valor de la BD o defecto de 3
            days_threshold = item['dias_antes_notificacion'] if item['dias_antes_notificacion'] is not None else 3

            # Notificar si está dentro del rango especificado
            if days_remaining <= days_threshold and days_remaining >= -1: 
                if item['email_notificacion']:
                    subject = f"🔔 Recordatorio: '{item['actividad']}' vence pronto"
                    
                    estado_urgencia = "¡Vence hoy!" if days_remaining == 0 else f"Vence en {days_remaining} días"
                    if days_remaining < 0: estado_urgencia = "¡Venció hace un día!"

                    body = f"""
                    Hola,

                    Este es un recordatorio automático de tu Sistema de Pendientes.

                    --------------------------------------------------
                    ACTIVIDAD: {item['actividad']}
                    --------------------------------------------------
                    
                    📅 Fecha Límite: {item['fecha_limite']} ({estado_urgencia})
                    🏢 Empresa:      {item['empresa']}
                    📝 Descripción:  {item['descripcion']}
                    
                    ⚠️ Estado Actual: {item['estado']}
                    
                    Por favor, gestiona este pendiente lo antes posible.

                    Saludos,
                    Tu Asistente Virtual
                    """
                    print(f"Enviando notificación para tarea ID {item['id']}...")
                    send_email(item['email_notificacion'], subject, body) 


if __name__ == '__main__':
    check_deadlines_and_notify()

def send_pending_tasks_email(client_name, pending_tasks, recipient_emails):
    """
    Envía un correo con las tareas pendientes de un cliente a múltiples destinatarios.
    
    Args:
        client_name: Nombre del cliente/empresa
        pending_tasks: Lista de tareas pendientes (cada tarea debe tener 'description' y 'created_at')
        recipient_emails: Lista de correos electrónicos o string con un solo correo
    
    Returns:
        dict con 'success' (bool) y 'message' (str)
    """
    # Bloquear notificaciones en fines de semana (Sábado=5, Domingo=6)
    if datetime.today().weekday() >= 5:
        return {
            'success': False,
            'message': 'No se envían correos los fines de semana'
        }
    
    # Convertir a lista si es un solo email
    if isinstance(recipient_emails, str):
        recipient_emails = [recipient_emails]
    
    # Validar que hay destinatarios
    if not recipient_emails or len(recipient_emails) == 0:
        return {
            'success': False,
            'message': 'No se especificaron destinatarios'
        }
    
    # Validar que hay tareas pendientes
    if not pending_tasks or len(pending_tasks) == 0:
        return {
            'success': False,
            'message': 'No hay tareas pendientes para enviar'
        }
    
    # Formatear el cuerpo del correo
    subject = f"📋 Tareas Pendientes - {client_name}"
    
    task_list = ""
    for idx, task in enumerate(pending_tasks, 1):
        created_date = task.get('created_at', 'Fecha no disponible')
        # Formatear fecha si está en formato ISO
        if created_date and created_date != 'Fecha no disponible':
            try:
                # Intentar parsear y formatear la fecha
                dt = datetime.fromisoformat(created_date.replace('Z', '+00:00'))
                created_date = dt.strftime('%Y-%m-%d %H:%M')
            except:
                pass  # Mantener formato original si falla
        
        task_list += f"{idx}. {task['description']}\n   📅 Creada: {created_date}\n\n"
    
    body = f"""Hola,

Este es un resumen de las tareas pendientes para el cliente:

--------------------------------------------------
CLIENTE: {client_name}
--------------------------------------------------

TAREAS PENDIENTES ({len(pending_tasks)}):

{task_list}

Por favor, gestiona estas tareas lo antes posible.

Saludos,
Sistema de Gestión de Pendientes
"""
    
    # Enviar a cada destinatario
    failed_emails = []
    successful_emails = []
    
    for email in recipient_emails:
        email = email.strip()
        if not email:
            continue
            
        success = send_email(email, subject, body)
        if success:
            successful_emails.append(email)
        else:
            failed_emails.append(email)
    
    # Preparar mensaje de respuesta
    if len(successful_emails) == len(recipient_emails):
        return {
            'success': True,
            'message': f'Correos enviados exitosamente a {len(successful_emails)} destinatario(s)'
        }
    elif len(successful_emails) > 0:
        return {
            'success': True,
            'message': f'Enviado a {len(successful_emails)} de {len(recipient_emails)} destinatarios. Fallaron: {", ".join(failed_emails)}'
        }
    else:
        return {
            'success': False,
            'message': f'Error al enviar correos a todos los destinatarios'
        }

