import sqlite3

conn = sqlite3.connect('pendientes.db')
cursor = conn.cursor()

# Contar clientes antes de borrar
cursor.execute('SELECT COUNT(*) FROM clientes')
total_antes = cursor.fetchone()[0]
print(f'Clientes antes de borrar: {total_antes}')

# Borrar todos los clientes
cursor.execute('DELETE FROM clientes')
conn.commit()

# Verificar que se borraron
cursor.execute('SELECT COUNT(*) FROM clientes')
total_despues = cursor.fetchone()[0]
print(f'Clientes después de borrar: {total_despues}')

print(f'\n✓ Se borraron {total_antes} clientes de la tabla.')

conn.close()
