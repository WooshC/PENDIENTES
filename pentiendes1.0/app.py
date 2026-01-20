from flask import Flask, render_template, request, redirect, url_for, flash, jsonify, send_from_directory
import database
import notifications
import os
from datetime import datetime, date

app = Flask(__name__, static_folder=os.path.join(os.path.dirname(os.path.abspath(__file__)), 'frontend/dist'), static_url_path='/')
app.secret_key = 'super_secret_key_for_flash_messages'
POSSIBLE_CORS = True # Set to False in production if served from same origin

if POSSIBLE_CORS:
    from flask_cors import CORS
    CORS(app)

# Inicializar BD
database.init_db()

# --- Rutas de Frontend (Producción) ---
@app.route('/')
def index():
    # En desarrollo, esto puede no funcionar si no se ha hecho 'npm run build'.
    # Lo ideal es usar el dev server de Vite para el frontend.
    try:
        return send_from_directory(app.static_folder, 'index.html')
    except:
        return "Frontend no construido. Ejecuta 'npm run build' en la carpeta frontend y reinicia."




# --- API PENDIENTES ---

@app.route('/api/pendientes', methods=['GET'])
def get_pendientes():
    pendientes = database.get_pendientes()
    # Convertir 'sqlite3.Row' a dict
    return jsonify([dict(row) for row in pendientes])

@app.route('/api/pendientes', methods=['POST'])
def add_pendiente():
    data = request.json
    database.add_pendiente(
        data['fecha'], data['actividad'], data.get('descripcion', ''),
        data.get('empresa', ''), 'Pendiente', data.get('observaciones', ''),
        data.get('fecha_limite', ''), data.get('email_notificacion', ''),
        data.get('dias_antes_notificacion', 3)
    )
    return jsonify({'message': 'Pendiente agregado'}), 201

@app.route('/api/pendientes/<int:id>', methods=['PUT'])
def update_pendiente(id):
    data = request.json
    database.update_pendiente(
        id, data['fecha'], data['actividad'], data.get('descripcion', ''),
        data.get('empresa', ''), data['estado'], data.get('observaciones', ''),
        data.get('fecha_limite', ''), data.get('email_notificacion', ''),
        data.get('dias_antes_notificacion', 3)
    )
    return jsonify({'message': 'Pendiente actualizado'})

# ... (omitted)



@app.route('/api/pendientes/<int:id>', methods=['DELETE'])
def delete_pendiente(id):
    database.delete_pendiente(id)
    return jsonify({'message': 'Pendiente eliminado'})

# --- API CLIENTES ---

@app.route('/api/clientes', methods=['GET'])
def api_get_clientes():
    clientes = database.get_clientes()
    return jsonify([dict(row) for row in clientes])


@app.route('/api/clientes', methods=['POST'])
def add_cliente():
    data = request.json
    database.add_cliente(
        data['empresa'], 
        data.get('observaciones', ''),
        data.get('check_estado', 0),
        data.get('procedimiento', ''),
        data.get('estado', 'Pendiente')
    )
    return jsonify({'message': 'Cliente agregado'}), 201


@app.route('/api/clientes/<int:id>', methods=['PUT'])
def update_cliente(id):
    data = request.json
    database.update_cliente(
        id, 
        data['empresa'], 
        data.get('observaciones', ''),
        data.get('check_estado', 0),
        data.get('procedimiento', ''),
        data.get('estado', 'Pendiente')
    )
    return jsonify({'message': 'Cliente actualizado'})


@app.route('/api/clientes/<int:id>', methods=['DELETE'])
def delete_cliente(id):
    database.delete_cliente(id)
    return jsonify({'message': 'Cliente eliminado'})

# --- API NOTIFICACIONES ---

@app.route('/api/notify/<int:id>', methods=['POST'])
def notify_api(id):
    item = database.get_pendiente(id)
    if item and item['email_notificacion']:
        subject = f"🔔 Recordatorio: '{item['actividad']}'"
        body = f"""Hola,
        
Registro de pendiente:
--------------------------------------------------
ACTIVIDAD: {item['actividad']}
--------------------------------------------------
📅 Fecha Límite: {item['fecha_limite']}
🏢 Empresa:      {item['empresa']}
📝 Descripción:  {item['descripcion']}
⚠️ Estado Actual: {item['estado']}
        
Saludos,
Tu Asistente Virtual"""
        success = notifications.send_email(item['email_notificacion'], subject, body)
        if success:
            return jsonify({'message': f'Correo enviado a {item["email_notificacion"]}'})
        else:
            return jsonify({'error': 'Error al enviar el correo'}), 500
    return jsonify({'error': 'No tiene correo configurado'}), 400


    return jsonify({'error': 'No tiene correo configurado'}), 400


# --- API CLIENT TASKS ---

@app.route('/api/clients/<int:client_id>/tasks', methods=['GET'])
def get_client_tasks(client_id):
    tasks = database.get_client_tasks(client_id)
    return jsonify([dict(row) for row in tasks])

@app.route('/api/clients/<int:client_id>/tasks', methods=['POST'])
def add_client_task(client_id):
    data = request.json
    database.add_client_task(client_id, data['description'])
    return jsonify({'message': 'Tarea agregada'}), 201

@app.route('/api/clients/<int:client_id>/tasks/bulk', methods=['POST'])
def add_client_tasks_bulk(client_id):
    data = request.json
    database.add_client_tasks_bulk(client_id, data['tasks'])
    return jsonify({'message': 'Tareas agregadas'}), 201

@app.route('/api/tasks/<int:id>', methods=['PUT'])
def update_task_status(id):
    data = request.json
    database.update_task_status(id, data['completed'])
    return jsonify({'message': 'Estado actualizado'})

@app.route('/api/tasks/<int:id>', methods=['DELETE'])
def delete_task(id):
    database.delete_task(id)
    return jsonify({'message': 'Tarea eliminada'})

@app.route('/api/tasks/global', methods=['POST'])
def add_global_task():
    data = request.json
    database.add_task_to_all_clients(data['description'])
    return jsonify({'message': 'Tarea global agregada a todos los clientes'}), 201

@app.route('/api/clients/<int:client_id>/create-pending-tasks', methods=['POST'])
def create_pending_tasks(client_id):
    """
    Crea registros en la tabla 'pendientes' a partir de las tareas pendientes de un cliente
    Body: { 
        "email": "destinatario@example.com",
        "dias_antes_notificacion": 3,
        "fecha_limite": "2026-01-30" (opcional)
    }
    """
    data = request.json
    email = data.get('email', '')
    dias_antes = data.get('dias_antes_notificacion', 3)
    fecha_limite = data.get('fecha_limite', '')
    
    if not email:
        return jsonify({'error': 'Debe especificar un correo electrónico'}), 400
    
    # Obtener información del cliente
    client = database.get_cliente(client_id)
    if not client:
        return jsonify({'error': 'Cliente no encontrado'}), 404
    
    # Obtener tareas pendientes
    pending_tasks = database.get_pending_tasks_by_client(client_id)
    
    if not pending_tasks or len(pending_tasks) == 0:
        return jsonify({'error': 'No hay tareas pendientes para este cliente'}), 400
    
    # Crear un pendiente por cada tarea pendiente
    from datetime import datetime
    fecha_hoy = datetime.now().strftime('%Y-%m-%d')
    
    created_count = 0
    for task in pending_tasks:
        database.add_pendiente(
            fecha=fecha_hoy,
            actividad=task['description'],
            descripcion=f"Tarea del cliente: {client['empresa']}",
            empresa=client['empresa'],
            estado='Pendiente',
            observaciones='',
            fecha_limite=fecha_limite,
            email_notificacion=email,
            dias_antes_notificacion=dias_antes
        )
        created_count += 1
    
    return jsonify({
        'message': f'{created_count} tarea(s) agregada(s) a Pendientes',
        'count': created_count
    }), 201


@app.route('/<path:path>')
def serve_static(path):
    # Evitar devolver index.html para llamadas a la API que fallan (404 real)
    if path.startswith('api/'):
        return jsonify({'error': 'Not found'}), 404

    # Sirve archivos estáticos generados por React
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        # Para routing de cliente (SPA), siempre devolvemos index.html si no es un archivo
        return send_from_directory(app.static_folder, 'index.html')


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)

