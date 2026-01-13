
import sqlite3
from datetime import datetime

DB_NAME = 'pendientes.db'

def get_db_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    # Estructura basada en la imagen del usuario
    conn.execute('''
        CREATE TABLE IF NOT EXISTS pendientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fecha TEXT NOT NULL,
            actividad TEXT NOT NULL,
            descripcion TEXT,
            empresa TEXT,
            estado TEXT DEFAULT 'Pendiente',
            observaciones TEXT,
            fecha_limite TEXT,
            email_notificacion TEXT
        )
    ''')
    conn.commit()
    conn.close()

def add_pendiente(fecha, actividad, descripcion, empresa, estado, observaciones, fecha_limite, email_notificacion):
    conn = get_db_connection()
    conn.execute('''
        INSERT INTO pendientes (fecha, actividad, descripcion, empresa, estado, observaciones, fecha_limite, email_notificacion)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (fecha, actividad, descripcion, empresa, estado, observaciones, fecha_limite, email_notificacion))
    conn.commit()
    conn.close()

def get_pendientes():
    conn = get_db_connection()
    pendientes = conn.execute('SELECT * FROM pendientes ORDER BY fecha_limite ASC').fetchall()
    conn.close()
    return pendientes

def get_pendiente(pendiente_id):
    conn = get_db_connection()
    pendiente = conn.execute('SELECT * FROM pendientes WHERE id = ?', (pendiente_id,)).fetchone()
    conn.close()
    return pendiente

def update_pendiente(pendiente_id, fecha, actividad, descripcion, empresa, estado, observaciones, fecha_limite, email_notificacion):
    conn = get_db_connection()
    conn.execute('''
        UPDATE pendientes
        SET fecha = ?, actividad = ?, descripcion = ?, empresa = ?, estado = ?, observaciones = ?, fecha_limite = ?, email_notificacion = ?
        WHERE id = ?
    ''', (fecha, actividad, descripcion, empresa, estado, observaciones, fecha_limite, email_notificacion, pendiente_id))
    conn.commit()
    conn.close()

def delete_pendiente(pendiente_id):
    conn = get_db_connection()
    conn.execute('DELETE FROM pendientes WHERE id = ?', (pendiente_id,))
    conn.commit()
    conn.close()
