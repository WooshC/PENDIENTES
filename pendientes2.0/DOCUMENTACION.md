# Documentación Técnica — Pendientes 2.0 (TaskFlow Pro)

> Documentación de la estructura actual del proyecto y de la base de datos.  
> Generada a partir del código fuente real de `pendientes2.0`.

---

## 1. Visión General

**Pendientes 2.0** (nombre comercial en frontend: *TaskFlow Pro*) es una aplicación web de escritorio/oficina para gestionar:

- **Pendientes**: tareas con fecha límite, recordatorios por correo y sub-tareas.
- **Clientes**: directorio de empresas con tareas de mantenimiento asociadas.
- **Notas de Soporte**: notas enriquecidas con imágenes, audios, archivos adjuntos y asistente de IA.
- **Herramientas**: respaldo, importación/exportación CSV y estado de la base de datos.

La arquitectura es **monolito full-stack**:

- **Backend**: ASP.NET Core 8.0 Web API + Entity Framework Core + SQL Server.
- **Frontend**: React 19 + Vite 7 + Tailwind CSS v4.
- El backend sirve el frontend compilado como archivos estáticos desde `wwwroot/`.

> **Nota importante:** el archivo `AGENTS.md` indica SQLite, pero el código actual usa **SQL Server** (`Microsoft.EntityFrameworkCore.SqlServer`). Existe un `pendientes.db` residual que ya no está referenciado en `Program.cs`.

---

## 2. Estructura de Carpetas

```
pendientes2.0/
├── .gitignore
├── AGENTS.md
├── DOCUMENTACION.md              # Este archivo
├── pendientes2.0.sln
├── run_app_optimized.bat
├── run_backup.bat
├── run_cloudflare_tunnel.bat
├── run_notifications.bat
├── backend/
│   ├── Backend.csproj
│   ├── Backend.http
│   ├── Program.cs
│   ├── appsettings.json
│   ├── appsettings.Development.json
│   ├── appsettings.local.json     # NO está en Git
│   ├── appsettings.local.json.example
│   ├── CONFIG.md
│   ├── pendientes.db              # residual SQLite
│   ├── Controllers/
│   │   ├── AiController.cs
│   │   ├── ClientTasksController.cs
│   │   ├── ClientesController.cs
│   │   ├── CsvImportExportController.cs
│   │   ├── DatabaseController.cs
│   │   ├── NotificationsController.cs
│   │   ├── PendienteTasksController.cs
│   │   ├── PendientesController.cs
│   │   └── SupportNotesController.cs
│   ├── Data/
│   │   └── AppDbContext.cs
│   ├── Models/
│   │   └── Entities.cs
│   ├── Services/
│   │   ├── DatabaseBackupService.cs
│   │   ├── EmailService.cs
│   │   └── EmailTemplateService.cs
│   ├── Migrations/                # EF Core para SQL Server
│   ├── Backups/                   # CSVs generados
│   ├── Properties/
│   │   └── launchSettings.json
│   └── wwwroot/                   # Frontend compilado + uploads
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── eslint.config.js
│   ├── README.md
│   ├── public/
│   ├── dist/                      # build de Vite
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       ├── api.js
│       ├── index.css
│       ├── App.css
│       ├── assets/
│       ├── components/
│       │   ├── Layout.jsx
│       │   └── ui/
│       │       ├── Badge.jsx
│       │       ├── Button.jsx
│       │       ├── EmptyState.jsx
│       │       ├── Modal.jsx
│       │       ├── SearchInput.jsx
│       │       ├── Spinner.jsx
│       │       └── index.js
│       └── pages/
│           ├── PendingPage.jsx
│           ├── ClientsPage.jsx
│           ├── SupportNotesPage.jsx
│           └── ToolsPage.jsx
└── cloudflare/
    ├── cloudflared-windows-amd64.exe
    └── config.yml
```

---

## 3. Tecnologías y Dependencias

### Backend (`backend/Backend.csproj`)

- **Framework:** .NET 8.0 (`net8.0`)
- **Tipo:** ASP.NET Core Web API (`Microsoft.NET.Sdk.Web`)
- **Nullable:** enabled
- **ImplicitUsings:** enabled

| Paquete | Versión | Uso |
|---|---|---|
| `Google.GenAI` | 0.15.0 | Instalado, no usado directamente |
| `Microsoft.AspNetCore.OpenApi` | 8.0.22 | OpenAPI/Swagger |
| `Microsoft.EntityFrameworkCore.Design` | 8.0.2 | Migrations CLI |
| `Microsoft.EntityFrameworkCore.SqlServer` | 8.0.2 | Base de datos SQL Server |
| `Swashbuckle.AspNetCore` | 6.6.2 | Swagger UI |

### Frontend (`frontend/package.json`)

| Paquete | Versión | Uso |
|---|---|---|
| `react` / `react-dom` | ^19.2.0 | UI |
| `react-router-dom` | ^7.12.0 | Enrutamiento |
| `vite` | ^7.2.4 | Build tool |
| `tailwindcss` | ^4.1.18 | Estilos |
| `@tailwindcss/postcss` | ^4.1.18 | PostCSS plugin |
| `axios` | ^1.13.2 | Cliente HTTP |
| `framer-motion` | ^12.27.5 | Animaciones |
| `sonner` | ^2.0.7 | Toasts |
| `lucide-react` | ^0.562.0 | Iconos |
| `@tiptap/react` / `starter-kit` / `extension-image` | ^3.22.5 | Editor rich-text |
| `@tiptap/extension-color` / `highlight` / `text-style` | ^3.23.2 | Formato de texto |
| `tiptap-extension-resize-image` | ^1.4.0 | Redimensionar imágenes |
| `date-fns` | ^4.1.0 | Fechas |
| `xlsx` | ^0.18.5 | Excel import/export |
| `react-day-picker` | ^9.13.0 | Selector de fechas |
| `clsx` | ^2.1.1 | Clases condicionales |
| `tailwind-merge` | ^3.4.0 | Merge de clases Tailwind |

---

## 4. Arquitectura de la Base de Datos

Motor: **SQL Server** (según `Program.cs` y migraciones actuales).

### 4.1 Entidades y Tablas

Archivo fuente: `backend/Models/Entities.cs`

#### `Pendiente` → `pendientes`

| Propiedad | Tipo | Columna | Default / Notas |
|---|---|---|---|
| `Id` | `int` | `id` | PK |
| `Fecha` | `string` | `fecha` | `yyyy-MM-dd` |
| `Actividad` | `string` | `actividad` | `"Sin título"` |
| `Descripcion` | `string?` | `descripcion` | |
| `Empresa` | `string?` | `empresa` | Usada para sincronizar con `Cliente` |
| `CCEmails` | `string?` | `cc_emails` | |
| `Estado` | `string` | `estado` | `"Pendiente"` |
| `Observaciones` | `string?` | `observaciones` | |
| `FechaLimite` | `string?` | `fecha_limite` | |
| `EmailNotificacion` | `string?` | `email_notificacion` | |
| `DiasAntesNotificacion` | `int` | `dias_antes_notificacion` | `3` |
| `AudioFilePath` | `string?` | `audio_file_path` | |
| `AudioTranscription` | `string?` | `audio_transcription` | |

#### `PendienteTask` → `pendiente_tasks`

| Propiedad | Tipo | Columna | Notas |
|---|---|---|---|
| `Id` | `int` | `id` | PK |
| `PendienteId` | `int` | `pendiente_id` | FK lógico |
| `Description` | `string` | `description` | `required` |
| `Completed` | `bool` | `completed` | |
| `CreatedAt` | `string` | `created_at` | `yyyy-MM-dd HH:mm:ss` |

#### `Cliente` → `clientes`

| Propiedad | Tipo | Columna | Notas |
|---|---|---|---|
| `Id` | `int` | `id` | PK |
| `Empresa` | `string` | `empresa` | `required` |
| `Observaciones` | `string?` | `observaciones` | |
| `CheckEstado` | `bool` | `check_estado` | |
| `Estado` | `string?` | `estado` | `"Pendiente"` |

#### `ClientTask` → `client_tasks`

| Propiedad | Tipo | Columna | Notas |
|---|---|---|---|
| `Id` | `int` | `id` | PK |
| `ClientId` | `int` | `client_id` | FK lógico |
| `Description` | `string` | `description` | `required` |
| `Completed` | `bool` | `completed` | |
| `CreatedAt` | `string` | `created_at` | `yyyy-MM-dd HH:mm:ss` |

#### `SupportNote` → `support_notes`

| Propiedad | Tipo | Columna | Notas |
|---|---|---|---|
| `Id` | `int` | `id` | PK |
| `Title` | `string` | `title` | `"Nota sin título"` |
| `Content` | `string` | `content` | HTML del editor TipTap |
| `CreatedAt` | `string` | `created_at` | |
| `UpdatedAt` | `string` | `updated_at` | |
| `Tags` | `string` | `tags` | `"Soporte"` |
| `TagColors` | `string` | `tag_colors` | JSON `{tag: color}` |
| `Images` | `List<SupportNoteImage>` | — | navegación |
| `Audios` | `List<SupportNoteAudio>` | — | navegación |
| `Files` | `List<SupportNoteFile>` | — | navegación |

#### `SupportNoteImage` → `support_note_images`

| Propiedad | Tipo | Columna | Notas |
|---|---|---|---|
| `Id` | `int` | `id` | PK |
| `SupportNoteId` | `int` | `support_note_id` | FK |
| `FileName` | `string` | `file_name` | Nombre original |
| `ContentType` | `string` | `content_type` | MIME type |
| `FilePath` | `string` | `file_path` | Ruta relativa en `wwwroot` |
| `FileSize` | `long` | `file_size` | Bytes |
| `CreatedAt` | `string` | `created_at` | |
| `SupportNote` | `SupportNote?` | — | navegación inversa |

#### `SupportNoteAudio` → `support_note_audios`

| Propiedad | Tipo | Columna | Notas |
|---|---|---|---|
| `Id` | `int` | `id` | PK |
| `SupportNoteId` | `int` | `support_note_id` | FK |
| `FileName` | `string` | `file_name` | |
| `ContentType` | `string` | `content_type` | `"audio/webm"` |
| `FilePath` | `string` | `file_path` | |
| `FileSize` | `long` | `file_size` | |
| `DurationSeconds` | `int?` | `duration_seconds` | |
| `CreatedAt` | `string` | `created_at` | |
| `SupportNote` | `SupportNote?` | — | navegación inversa |

#### `SupportNoteFile` → `support_note_files`

| Propiedad | Tipo | Columna | Notas |
|---|---|---|---|
| `Id` | `int` | `id` | PK |
| `SupportNoteId` | `int` | `support_note_id` | FK |
| `FileName` | `string` | `file_name` | |
| `ContentType` | `string` | `content_type` | `"application/octet-stream"` |
| `FilePath` | `string` | `file_path` | |
| `FileSize` | `long` | `file_size` | |
| `CreatedAt` | `string` | `created_at` | |
| `SupportNote` | `SupportNote?` | — | navegación inversa |

> `support_note_files` se crea mediante un **schema patch** en `Program.cs`, no a través de migraciones EF.

#### `AiChatMessage` → `ai_chat_history`

| Propiedad | Tipo | Columna | Notas |
|---|---|---|---|
| `Id` | `int` | `id` | PK |
| `Role` | `string` | `role` | `"user"` / `"ai"` |
| `Content` | `string` | `content` | |
| `CreatedAt` | `string` | `created_at` | |

### 4.2 DbContext

Archivo: `backend/Data/AppDbContext.cs`

```csharp
public DbSet<Pendiente> Pendientes { get; set; }
public DbSet<PendienteTask> PendienteTasks { get; set; }
public DbSet<Cliente> Clientes { get; set; }
public DbSet<ClientTask> ClientTasks { get; set; }
public DbSet<SupportNote> SupportNotes { get; set; }
public DbSet<SupportNoteImage> SupportNoteImages { get; set; }
public DbSet<SupportNoteAudio> SupportNoteAudios { get; set; }
public DbSet<SupportNoteFile> SupportNoteFiles { get; set; }
public DbSet<AiChatMessage> AiChatHistory { get; set; }
```

Configuraciones en `OnModelCreating`:

- `Pendiente.Estado` → default `"Pendiente"`
- `Pendiente.DiasAntesNotificacion` → default `3`
- `SupportNote.Images` → cascada
- `SupportNote.Audios` → cascada
- `SupportNote.Files` → cascada

### 4.3 Migraciones

Las migraciones en `backend/Migrations/` están generadas para **SQL Server**. El modelo actual incluye las entidades listadas arriba; la tabla `support_note_files` se asegura adicionalmente con un patch SQL en `Program.cs` para compatibilidad con bases de datos antiguas.

---

## 5. Endpoints de la API

### `PendientesController` — `/api/pendientes`

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/pendientes` | Lista todos ordenados por `fecha_limite` |
| `POST` | `/api/pendientes` | Crea pendiente; sincroniza con cliente si aplica |
| `PUT` | `/api/pendientes/{id}` | Actualiza pendiente |
| `DELETE` | `/api/pendientes/{id}` | Elimina pendiente y sus tareas |
| `GET` | `/api/pendientes/{id}/complete-all-tasks` | Redirige al frontend `/?pendiente={id}` |

### `PendienteTasksController` — `/api/pendientes`

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/pendientes/{pendienteId}/tasks` | Lista tareas |
| `POST` | `/api/pendientes/{pendienteId}/tasks` | Agrega tarea |
| `POST` | `/api/pendientes/{pendienteId}/tasks/bulk` | Agrega múltiples tareas |
| `PUT` | `/api/pendientes/{pendienteId}/tasks/{taskId}` | Actualiza tarea |
| `DELETE` | `/api/pendientes/{pendienteId}/tasks/{taskId}` | Elimina tarea |
| `POST` | `/api/pendientes/{pendienteId}/complete` | Marca pendiente como `Finalizado` |

### `ClientesController` — `/api/clientes`

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/clientes` | Lista con campos calculados de tareas |
| `POST` | `/api/clientes` | Crea cliente |
| `POST` | `/api/clientes/bulk` | Importa lista de clientes |
| `PUT` | `/api/clientes/{id}` | Actualiza cliente |
| `DELETE` | `/api/clientes/{id}` | Elimina cliente |

### `ClientTasksController` — `/api`

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/clients/{clientId}/tasks` | Lista tareas del cliente |
| `POST` | `/api/clients/{clientId}/tasks` | Agrega tarea |
| `POST` | `/api/clients/{clientId}/tasks/bulk` | Agrega múltiples |
| `PUT` | `/api/tasks/{id}` | Cambia estado de tarea |
| `DELETE` | `/api/tasks/{id}` | Elimina tarea |
| `POST` | `/api/tasks/global` | Crea tarea para todos los clientes |
| `POST` | `/api/clients/{clientId}/create-pending-tasks` | Genera un `Pendiente` desde tareas pendientes |

### `SupportNotesController` — `/api/supportnotes`

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/supportnotes` | Lista notas |
| `GET` | `/api/supportnotes/{id}` | Detalle con imágenes y archivos |
| `POST` | `/api/supportnotes` | Crea nota |
| `PUT` | `/api/supportnotes/{id}` | Actualiza nota |
| `DELETE` | `/api/supportnotes/{id}` | Elimina nota + archivos físicos |
| `POST` | `/api/supportnotes/{noteId}/images` | Sube imagen (máx 5MB) |
| `GET` | `/api/supportnotes/images/{imageId}` | Sirve imagen |
| `DELETE` | `/api/supportnotes/images/{imageId}` | Elimina imagen |
| `GET` | `/api/supportnotes/{noteId}/images` | Lista imágenes |
| `POST` | `/api/supportnotes/{id}/content` | Actualiza solo contenido HTML |
| `POST` | `/api/supportnotes/{noteId}/audios` | Sube audio (máx 20MB) |
| `GET` | `/api/supportnotes/audios/{audioId}` | Sirve audio |
| `DELETE` | `/api/supportnotes/audios/{audioId}` | Elimina audio |
| `POST` | `/api/supportnotes/{noteId}/files` | Sube archivo adjunto (máx 100MB) |
| `GET` | `/api/supportnotes/files/{fileId}` | Descarga archivo |
| `DELETE` | `/api/supportnotes/files/{fileId}` | Elimina archivo |
| `GET` | `/api/supportnotes/{noteId}/files` | Lista archivos |

### `NotificationsController` — `/api`

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/notify/{id}` | Envía correo manual de recordatorio |
| `POST` | `/api/notifications/check-all` | Envía correos automáticos por fechas límite |

### `AiController` — `/api/ai`

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/ai/history` | Historial de chat |
| `DELETE` | `/api/ai/history` | Limpia historial |
| `POST` | `/api/ai/ask` | Consulta a Groq usando notas como contexto |

### `DatabaseController` / `CsvImportExportController` — `/api/database`

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/database/backup` | Dispara respaldo manual CSV |
| `GET` | `/api/database/status` | Conteos por tabla |
| `GET` | `/api/database/export/{tabla}` | Exporta CSV (`;`) |
| `POST` | `/api/database/import/{tabla}` | Importa CSV (`;`) |

Tablas soportadas para import/export: `pendientes`, `pendiente_tasks`, `clientes`, `client_tasks`, `support_notes`, `ai_chat_history`.

---

## 6. Servicios

### `EmailService`

- Envía correos vía SMTP (por defecto Gmail, puerto 587, SSL).
- Soporta `CC` separados por coma o punto y coma.
- Interfaz: `IEmailService.SendEmailAsync(to, subject, body, ccEmails?)`.

### `EmailTemplateService`

- Genera plantilla HTML para recordatorios de pendientes.
- Incluye actividad, fecha límite, empresa, estado, urgencia, observaciones, tareas y botón al frontend.
- Botón apunta a `{BaseUrl}/?pendiente={id}`.

### `DatabaseBackupService`

- `BackgroundService` que ejecuta respaldo cada **domingo a las 2:00 AM**.
- Exporta tablas a CSV en `backend/Backups/backup_YYYYMMDD_HHMMSS/`.
- El respaldo `.bak` de SQLite fue removido tras la migración a SQL Server.

---

## 7. Configuración y Arranque

### `Program.cs`

- Carga `appsettings.local.json` (opcional, recargable).
- Escucha en `http://*:5002`.
- Serialización JSON con `PropertyNamingPolicy = SnakeCaseLower`.
- Swagger/OpenAPI en desarrollo.
- `DbContext` configurado con SQL Server (`UseSqlServer(DefaultConnection)`).
- CORS abierto: `AllowAnyOrigin`, `AllowAnyMethod`, `AllowAnyHeader`.
- Al inicio:
  - Ejecuta `context.Database.MigrateAsync()`.
  - Aplica schema patch para `support_note_files` si no existe.
- Static files:
  - Crea `wwwroot/uploads` y `wwwroot/uploads/support-notes`.
  - `UseDefaultFiles`, `UseStaticFiles`, `MapFallbackToFile("index.html")`.

### Jerarquía de Configuración

1. `appsettings.json` — valores por defecto.
2. `appsettings.Development.json` — solo desarrollo.
3. `appsettings.local.json` — **configuración local/sensible, NO en Git**.

Valores críticos en `appsettings.local.json`:

```json
{
  "BaseUrl": "http://192.168.0.13:5002",
  "Email": {
    "SmtpServer": "smtp.gmail.com",
    "SmtpPort": "587",
    "SenderEmail": "tu-email@gmail.com",
    "SenderPassword": "tu-app-password"
  },
  "AI": {
    "ApiKey": "gsk_..."
  }
}
```

### Scripts de Ejecución

| Script | Propósito |
|---|---|
| `run_app_optimized.bat` | `npm install` → `npm run build` → copia `dist/` a `backend/wwwroot/` → `dotnet run` |
| `run_backup.bat` | POST a `/api/database/backup` vía `curl` |
| `run_notifications.bat` | POST a `/api/notifications/check-all` vía `curl` |
| `run_cloudflare_tunnel.bat` | Ejecuta `cloudflared` para exponer `localhost:5002` |

---

## 8. Frontend

### Estructura `src/`

```
src/
├── App.jsx
├── main.jsx
├── api.js
├── index.css
├── App.css
├── assets/
├── components/
│   ├── Layout.jsx
│   └── ui/
│       ├── Badge.jsx
│       ├── Button.jsx
│       ├── EmptyState.jsx
│       ├── Modal.jsx
│       ├── SearchInput.jsx
│       ├── Spinner.jsx
│       └── index.js
└── pages/
    ├── PendingPage.jsx
    ├── ClientsPage.jsx
    ├── SupportNotesPage.jsx
    └── ToolsPage.jsx
```

### Rutas (`App.jsx`)

| Ruta | Componente |
|---|---|
| `/` | `PendingPage` |
| `/clientes` | `ClientsPage` |
| `/notas` | `SupportNotesPage` |
| `/herramientas` | `ToolsPage` |
| `*` | Redirect a `/` |

### Páginas

- **`PendingPage.jsx`**: gestión de pendientes con lista, tareas, modales de creación/edición y tarea global.
- **`ClientsPage.jsx`**: directorio de clientes, tareas por cliente, import/export Excel, conversión a pendientes.
- **`SupportNotesPage.jsx`**: editor TipTap con imágenes, audios, archivos adjuntos, etiquetas con colores, filtros y asistente IA.
- **`ToolsPage.jsx`**: respaldo manual, estado de BD, import/export CSV por tabla.

### Utilidades

- `api.js`: cliente Axios centralizado con `baseURL` condicional según entorno.
- `index.css`: Tailwind + estilos custom para TipTap, scrollbars y animaciones.

---

## 9. Lógica de Negocio Importante

### Sincronización Pendiente ↔ Cliente

- Cuando un `Pendiente` tiene `empresa` coincidente con un `Cliente`, sus tareas pendientes se sincronizan como `ClientTask`.
- Al completar tareas de un pendiente, se actualiza el estado del cliente (`Pendiente`, `En Curso`, `Finalizado`).
- Completar un pendiente marca su estado como `Finalizado` y limpia las tareas del cliente.

### Notificaciones por Correo

- Se envían a `email_notificacion` con copia a `cc_emails`.
- `CheckAllNotifications` omite fines de semana y envía correos solo si faltan `dias_antes_notificacion` o menos, o está vencido por 1 día.

### IA y Notas de Soporte

- La IA usa la API de **Groq** (`llama-3.3-70b-versatile`) con endpoint OpenAI-compatible.
- Antes de consultar, el backend filtra las notas relevantes por palabras clave para no exceder límites de tokens.
- El historial de chat se persiste en `ai_chat_history`.

### Subida de Archivos

- **Imágenes**: máx 5MB, tipos `image/jpeg`, `image/png`, `image/gif`, `image/webp`.
- **Audios**: máx 20MB, tipos `audio/webm`, `audio/mp3`, `audio/mpeg`, `audio/wav`, `audio/ogg`, `audio/mp4`, `audio/x-m4a`.
- **Archivos adjuntos**: máx 100MB, **cualquier tipo de archivo permitido** (proyecto local).
- Las imágenes se guardan en `wwwroot/uploads/support-notes/{noteId}/`.
- Los audios se guardan en `wwwroot/uploads/support-notes/{noteId}/audios/`.
- Los archivos adjuntos se guardan en `wwwroot/uploads/support-notes/{noteId}/files/`.

---

## 10. Consideraciones de Seguridad

- **Sin autenticación ni autorización**: la app es de uso interno/oficina.
- **CORS**: permite cualquier origen.
- **Credenciales**: `SenderPassword` de Gmail y `AI:ApiKey` se almacenan en texto plano en `appsettings.local.json`.
- **HTML en notas**: el contenido de `SupportNote.Content` no se sanitiza actualmente.
- **Base de datos SQL Server**: requiere connection string configurado.

---

## 11. Notas para Desarrolladores

### Agregar una nueva propiedad a una entidad

1. Modifica la clase en `backend/Models/Entities.cs`.
2. Crea una migración de EF Core:
   ```bash
   cd backend
   dotnet ef migrations add NombreDeLaMigracion
   ```
3. Alternativamente, para compatibilidad con DBs antiguas, agrega un patch en `Program.cs`.

### Agregar un nuevo endpoint

1. Agrega la acción en el controller correspondiente en `backend/Controllers/`.
2. Agrega la función en `frontend/src/api.js`.
3. Usa la función en el componente de página correspondiente.

### Desplegar en producción (modo oficina)

1. Configura `appsettings.local.json` con la IP local en `BaseUrl`.
2. Abre el puerto 5002 en el firewall de Windows.
3. Ejecuta `run_app_optimized.bat`.
4. (Opcional) Ejecuta `run_cloudflare_tunnel.bat` para acceso remoto.
5. (Opcional) Programa `run_notifications.bat` en el Programador de Tareas de Windows.
