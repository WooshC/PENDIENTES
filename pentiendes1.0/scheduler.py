from apscheduler.schedulers.blocking import BlockingScheduler
from datetime import date
import database
import notifications

def revisar_pendientes():
    print("running scheduler")
    # Usamos la lógica centralizada de notifications.py para mantener la regla de "3 días"
    # y el formato de correo consistente.
    notifications.check_deadlines_and_notify()

if __name__ == "__main__":
    database.init_db()
    scheduler = BlockingScheduler()

    # Ejecutar cada día a las 08:00 AM
    scheduler.add_job(revisar_pendientes, 'cron', hour=17, minute=32)

    print("🕒 Scheduler iniciado...")
    scheduler.start()
