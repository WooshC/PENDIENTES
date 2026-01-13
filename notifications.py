
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

            # Lógica: Notificar si faltan 3 días o menos (y no ha pasado la fecha, o sí, dependiendo de lo deseado. Asumiremos alertas futuras y vencidas recientemente)
            # El usuario pidió: "cuando quede de plazo menos de 3 días"
            if days_remaining <= 3 and days_remaining >= -1: # Incluye vencidos ayer, hoy, y próximos 3 días
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
