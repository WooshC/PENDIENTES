# Guía para Solucionar el Problema de Migraciones

## Problema
Las tablas ya existen en la base de datos (de la versión Python), pero EF Core intenta crearlas nuevamente porque no tiene registro de que ya fueron creadas.

## Solución

Tienes **3 opciones** para resolver esto:

### Opción 1: Usar DB Browser for SQLite (Recomendado - Más Fácil)

1. Descarga e instala [DB Browser for SQLite](https://sqlitebrowser.org/dl/)
2. Abre el archivo `pendientes.db` con DB Browser
3. Ve a la pestaña "Execute SQL"
4. Ejecuta este SQL:

```sql
INSERT INTO __EFMigrationsHistory (MigrationId, ProductVersion)
VALUES ('20260121002032_AddCCEmails', '8.0.2');
```

5. Haz clic en "Write Changes" (icono de guardar)
6. Cierra DB Browser
7. Ejecuta: `dotnet ef database update`

### Opción 2: Usar PowerShell con System.Data.SQLite

Ejecuta estos comandos en PowerShell (en la carpeta backend):

```powershell
# Instalar el paquete SQLite para PowerShell
Install-Package System.Data.SQLite.Core -Source nuget.org

# Ejecutar el SQL
$conn = New-Object -TypeName System.Data.SQLite.SQLiteConnection
$conn.ConnectionString = "Data Source=pendientes.db"
$conn.Open()
$cmd = $conn.CreateCommand()
$cmd.CommandText = "INSERT INTO __EFMigrationsHistory (MigrationId, ProductVersion) VALUES ('20260121002032_AddCCEmails', '8.0.2')"
$cmd.ExecuteNonQuery()
$conn.Close()
Write-Host "✓ Migración marcada como aplicada" -ForegroundColor Green
```

Luego ejecuta: `dotnet ef database update`

### Opción 3: Recrear la Base de Datos (Más Drástico)

Si no tienes datos importantes:

```powershell
# Respaldar la base de datos actual
Copy-Item pendientes.db pendientes.db.backup

# Eliminar la base de datos
Remove-Item pendientes.db

# Crear nueva base de datos con todas las migraciones
dotnet ef database update
```

## Después de Aplicar Cualquier Opción

Ejecuta:
```bash
dotnet ef database update
```

Deberías ver:
```
Applying migration '20260121153700_RemoveProcedimientoFromClientes'.
Done.
```

## Verificación

Para verificar que todo está correcto:

```bash
dotnet ef migrations list
```

Deberías ver ambas migraciones marcadas como "Applied":
```
20260121002032_AddCCEmails (Applied)
20260121153700_RemoveProcedimientoFromClientes (Applied)
```
