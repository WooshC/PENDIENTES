
from flask import Flask, render_template, request, redirect, url_for, flash
import database
import notifications
from datetime import datetime, date

app = Flask(__name__)
app.secret_key = 'super_secret_key_for_flash_messages'

# Inicializar BD al arrancar (en producción esto se haría mejor, pero aquí es práctico)
database.init_db()

@app.route('/')
def index():
    pendientes = database.get_pendientes()
    today = date.today().isoformat()
    return render_template('index.html', pendientes=pendientes, today=today)

@app.route('/add', methods=('GET', 'POST'))
def add():
    if request.method == 'POST':
        fecha = request.form['fecha']
        actividad = request.form['actividad']
        descripcion = request.form['descripcion']
        empresa = request.form['empresa']
        estado = request.form['estado']
        observaciones = request.form['observaciones']
        fecha_limite = request.form['fecha_limite']
        email_notificacion = request.form['email_notificacion']

        database.add_pendiente(fecha, actividad, descripcion, empresa, estado, observaciones, fecha_limite, email_notificacion)
        flash('Pendiente agregado correctamente!')
        return redirect(url_for('index'))

    return render_template('form.html', action='Agregar')

@app.route('/edit/<int:id>', methods=('GET', 'POST'))
def edit(id):
    pendiente = database.get_pendiente(id)
    
    if request.method == 'POST':
        fecha = request.form['fecha']
        actividad = request.form['actividad']
        descripcion = request.form['descripcion']
        empresa = request.form['empresa']
        estado = request.form['estado']
        observaciones = request.form['observaciones']
        fecha_limite = request.form['fecha_limite']
        email_notificacion = request.form['email_notificacion']

        database.update_pendiente(id, fecha, actividad, descripcion, empresa, estado, observaciones, fecha_limite, email_notificacion)
        flash('Pendiente actualizado correctamente!')
        return redirect(url_for('index'))

    return render_template('form.html', pendiente=pendiente, action='Editar')

@app.route('/delete/<int:id>', methods=('POST',))
def delete(id):
    database.delete_pendiente(id)
    flash('Pendiente eliminado.')
    return redirect(url_for('index'))

@app.route('/notify/<int:id>', methods=('POST',))
def notify_manual(id):
    item = database.get_pendiente(id)
    if item and item['email_notificacion']:
        # Construir cuerpo similar al automático
        subject = f"🔔 Recordatorio: '{item['actividad']}'"
        
        body = f"""
        Hola,
        
        Aquí tienes los detalles del pendiente solicitado:
        
        --------------------------------------------------
        ACTIVIDAD: {item['actividad']}
        --------------------------------------------------
        
        📅 Fecha Límite: {item['fecha_limite']}
        🏢 Empresa:      {item['empresa']}
        📝 Descripción:  {item['descripcion']}
        
        ⚠️ Estado Actual: {item['estado']}
        
        Saludos,
        Tu Asistente Virtual
        """
        success = notifications.send_email(item['email_notificacion'], subject, body)
        if success:
            flash(f'Correo enviado a {item["email_notificacion"]}')
        else:
            flash('Error al enviar el correo. Revisa la consola/logs.')
    else:
        flash('Este pendiente no tiene correo configurado o no existe.')
    
    return redirect(url_for('index'))

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)

