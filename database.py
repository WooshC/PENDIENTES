
import sqlite3
from datetime import datetime

DB_NAME = 'pendientes.db'

def get_db_connection():
    # Aumentar timeout a 10s para evitar "database is locked" en concurrencia
    conn = sqlite3.connect(DB_NAME, timeout=10)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    try:
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
        conn.execute('''
            CREATE TABLE IF NOT EXISTS clientes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                empresa TEXT NOT NULL,
                observaciones TEXT,
                check_estado INTEGER DEFAULT 0,
                procedimiento TEXT
            )
        ''')
        
        conn.execute('''
            CREATE TABLE IF NOT EXISTS client_tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                client_id INTEGER NOT NULL,
                description TEXT NOT NULL,
                completed INTEGER DEFAULT 0,
                FOREIGN KEY (client_id) REFERENCES clientes (id)
            )
        ''')
        
        # Migración manual para columnas nuevas
        try:
            conn.execute('ALTER TABLE clientes ADD COLUMN check_estado INTEGER DEFAULT 0')
        except sqlite3.OperationalError:
            pass # Ya existe
            
        try:
            conn.execute('ALTER TABLE clientes ADD COLUMN procedimiento TEXT')
        except sqlite3.OperationalError:
            pass # Ya existe

        try:
            conn.execute("ALTER TABLE clientes ADD COLUMN estado TEXT DEFAULT 'Pendiente'")
        except sqlite3.OperationalError:
            pass # Ya existe

        try:
            conn.execute("ALTER TABLE pendientes ADD COLUMN dias_antes_notificacion INTEGER DEFAULT 3")
        except sqlite3.OperationalError:
            pass # Ya existe

        try:
            conn.execute("ALTER TABLE client_tasks ADD COLUMN created_at TEXT DEFAULT CURRENT_TIMESTAMP")
        except sqlite3.OperationalError:
            pass # Ya existe

        conn.commit()
    finally:
        conn.close()

def add_pendiente(fecha, actividad, descripcion, empresa, estado, observaciones, fecha_limite, email_notificacion, dias_antes_notificacion=3):
    conn = get_db_connection()
    try:
        conn.execute('''
            INSERT INTO pendientes (fecha, actividad, descripcion, empresa, estado, observaciones, fecha_limite, email_notificacion, dias_antes_notificacion)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (fecha, actividad, descripcion, empresa, estado, observaciones, fecha_limite, email_notificacion, dias_antes_notificacion))
        conn.commit()
    finally:
        conn.close()

def get_pendientes():
    conn = get_db_connection()
    try:
        pendientes = conn.execute('SELECT * FROM pendientes ORDER BY fecha_limite ASC').fetchall()
        return pendientes
    finally:
        conn.close()

def get_pendiente(pendiente_id):
    conn = get_db_connection()
    try:
        pendiente = conn.execute('SELECT * FROM pendientes WHERE id = ?', (pendiente_id,)).fetchone()
        return pendiente
    finally:
        conn.close()

def update_pendiente(pendiente_id, fecha, actividad, descripcion, empresa, estado, observaciones, fecha_limite, email_notificacion, dias_antes_notificacion=3):
    conn = get_db_connection()
    try:
        conn.execute('''
            UPDATE pendientes
            SET fecha = ?, actividad = ?, descripcion = ?, empresa = ?, estado = ?, observaciones = ?, fecha_limite = ?, email_notificacion = ?, dias_antes_notificacion = ?
            WHERE id = ?
        ''', (fecha, actividad, descripcion, empresa, estado, observaciones, fecha_limite, email_notificacion, dias_antes_notificacion, pendiente_id))
        conn.commit()
    finally:
        conn.close()

def delete_pendiente(pendiente_id):
    conn = get_db_connection()
    try:
        conn.execute('DELETE FROM pendientes WHERE id = ?', (pendiente_id,))
        conn.commit()
    finally:
        conn.close()

# --- CLIENTES ---

def get_clientes():
    conn = get_db_connection()
    try:
        # Recuperar clientes junto con sus tareas y contadores para calcular estado dinámico
        query = '''
            SELECT c.*, 
                   GROUP_CONCAT(ct.description, '|||') as task_list,
                   COUNT(ct.id) as total_tasks,
                   SUM(CASE WHEN ct.completed = 1 THEN 1 ELSE 0 END) as completed_tasks
            FROM clientes c
            LEFT JOIN client_tasks ct ON c.id = ct.client_id
            GROUP BY c.id
            ORDER BY c.empresa ASC
        '''
        clientes = conn.execute(query).fetchall()
        return clientes
    finally:
        conn.close()

def get_cliente(cliente_id):
    conn = get_db_connection()
    try:
        cliente = conn.execute('SELECT * FROM clientes WHERE id = ?', (cliente_id,)).fetchone()
        return cliente
    finally:
        conn.close()

def add_cliente(empresa, observaciones, check_estado=0, procedimiento='', estado='Pendiente'):
    conn = get_db_connection()
    try:
        conn.execute('''
            INSERT INTO clientes (empresa, observaciones, check_estado, procedimiento, estado)
            VALUES (?, ?, ?, ?, ?)
        ''', (empresa, observaciones, check_estado, procedimiento, estado))
        conn.commit()
    finally:
        conn.close()

def update_cliente(cliente_id, empresa, observaciones, check_estado, procedimiento, estado):
    conn = get_db_connection()
    try:
        conn.execute('''
            UPDATE clientes
            SET empresa = ?, observaciones = ?, check_estado = ?, procedimiento = ?, estado = ?
            WHERE id = ?
        ''', (empresa, observaciones, check_estado, procedimiento, estado, cliente_id))
        conn.commit()
    finally:
        conn.close()

def delete_cliente(cliente_id):
    conn = get_db_connection()
    try:
        conn.execute('DELETE FROM clientes WHERE id = ?', (cliente_id,))
        conn.commit()
    finally:
        conn.close()

# --- CLIENT TASKS ---

def get_client_tasks(client_id):
    conn = get_db_connection()
    try:
        tasks = conn.execute('SELECT * FROM client_tasks WHERE client_id = ? ORDER BY id DESC', (client_id,)).fetchall()
        return tasks
    finally:
        conn.close()

def add_client_task(client_id, description):
    conn = get_db_connection()
    try:
        conn.execute('INSERT INTO client_tasks (client_id, description) VALUES (?, ?)', (client_id, description))
        conn.commit()
    finally:
        conn.close()

def add_client_tasks_bulk(client_id, descriptions):
    """
    Agrega multiples tareas a un cliente.
    descriptions: lista de strings
    """
    if not descriptions:
        return
        
    conn = get_db_connection()
    try:
        data = [(client_id, desc) for desc in descriptions]
        conn.executemany('INSERT INTO client_tasks (client_id, description) VALUES (?, ?)', data)
        conn.commit()
    finally:
        conn.close()

def update_task_status(task_id, completed):
    conn = get_db_connection()
    try:
        conn.execute('UPDATE client_tasks SET completed = ? WHERE id = ?', (1 if completed else 0, task_id))
        conn.commit()
    finally:
        conn.close()

def delete_task(task_id):
    conn = get_db_connection()
    try:
        conn.execute('DELETE FROM client_tasks WHERE id = ?', (task_id,))
        conn.commit()
    finally:
        conn.close()

def add_task_to_all_clients(description):
    conn = get_db_connection()
    try:
        # Get all client IDs
        clients = conn.execute('SELECT id FROM clientes').fetchall()
        
        # Batch insert
        data = [(client['id'], description) for client in clients]
        conn.executemany('INSERT INTO client_tasks (client_id, description) VALUES (?, ?)', data)
        conn.commit()
    finally:
        conn.close()

def get_pending_tasks_by_client(client_id):
    """
    Obtiene todas las tareas pendientes (no completadas) de un cliente
    incluyendo la fecha de creación
    """
    conn = get_db_connection()
    try:
        tasks = conn.execute('''
            SELECT id, description, created_at, completed
            FROM client_tasks 
            WHERE client_id = ? AND completed = 0
            ORDER BY created_at DESC
        ''', (client_id,)).fetchall()
        return tasks
    finally:
        conn.close()
