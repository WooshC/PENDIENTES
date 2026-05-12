# AGENTS.md — Pendientes 2.0 (TaskFlow Pro)

> Este archivo está escrito en español porque todo el código, comentarios, documentación e interfaz del proyecto están en español.

---

## Visión General del Proyecto

**Pendientes 2.0** (nombre comercial en frontend: *TaskFlow Pro*) es una aplicación web de escritorio/oficina para gestionar:

- **Pendientes**: tareas con fecha límite, recordatorios por correo y sub-tareas.
- **Clientes**: directorio de empresas con tareas de mantenimiento asociadas.
- **Notas de Soporte**: notas enriquecidas con imágenes y asistente de IA.

La arquitectura es **monolito full-stack**:

- **Backend**: ASP.NET Core 8.0 Web API + Entity Framework Core + SQLite.
- **Frontend**: React 19 + Vite 7 + Tailwind CSS v4.
- El backend sirve el frontend compilado como archivos estáticos desde `wwwroot/`.

---

## Tecnologías y Dependencias Clave

### Backend (`backend/`)

| Paquete | Versión | Uso |
|---------|---------|-----|
| `Microsoft.NET.Sdk.Web` | 8.0 | Framework base |
| `Microsoft.EntityFrameworkCore.Sqlite` | 8.0.2 | Base de datos SQLite |
| `Microsoft.EntityFrameworkCore.Design` | 8.0.2 | Migrations CLI |
| `Swashbuckle.AspNetCore` | 6.6.2 | Swagger/OpenAPI |
| `Microsoft.AspNetCore.OpenApi` | 8.0.22 | Documentación API |
| `Google.GenAI` | 0.15.0 | Instalado pero no usado directamente (la IA usa Groq vía HTTP) |

### Frontend (`frontend/`)

| Paquete | Uso |
|---------|-----|
| `react` / `react-dom` ^19.2.0 | UI |
| `react-router-dom` ^7.12.0 | Enrutamiento (3 rutas) |
| `vite` ^7.2.4 | Build tool |
| `tailwindcss` ^4.1.18 | Estilos utility-first |
| `@tailwindcss/postcss` | Integración PostCSS |
| `axios` ^1.13.2 | Cliente HTTP |
| `framer-motion` ^12.27.5 | Animaciones |
| `sonner` ^2.0.7 | Notificaciones toast |
| `lucide-react` ^0.562.0 | Iconos |
| `@tiptap/react` / `starter-kit` / `extension-image` ^3.22.5 | Editor rich-text para notas |
| `tiptap-extension-resize-image` ^1.4.0 | Redimensionar imágenes en editor |
| `date-fns` ^4.1.0 | Formato de fechas |
| `xlsx` ^0.18.5 | Importar/exportar Excel de clientes |

---

## Estructura de Carpetas

```
pendientes2.0/
├── backend/
│   ├── Controllers/          # API controllers (ver listado abajo)
│   ├── Data/
│   │   └── AppDbContext.cs   # DbContext de EF Core
│   ├── Models/
│   │   └── Entities.cs       # Todas las entidades en un solo archivo
│   ├── Services/
│   │   ├── EmailService.cs           # SMTP (Gmail)
│   │   ├── EmailTemplateService.cs   # Plantillas HTML para correos
│   │   └── DatabaseBackupService.cs  # Respaldo semanal en segundo plano
│   ├── Migrations/           # Migraciones de EF Core
│   ├── Backups/              # Salida de respaldos CSV + .bak SQLite
│   ├── wwwroot/              # Frontend compilado (copiado en build)
│   ├── Program.cs            # Punto de entrada, pipeline, migraciones
│   ├── Backend.csproj
│   ├── appsettings.json              # Config base
│   ├── appsettings.Development.json  # Config dev
│   └── appsettings.local.json        # **NO ESTÁ EN GIT** — credenciales locales
├── frontend/
│   ├── src/
│   │   ├── App.jsx           # Router con 3 rutas
│   │   ├── main.jsx          # Entry point React
│   │   ├── api.js            # Todas las llamadas Axios a la API
│   │   ├── index.css         # Tailwind + estilos custom (TipTap)
│   │   ├── pages/
│   │   │   ├── PendingPage.jsx       # Gestión de pendientes y tareas
│   │   │   ├── ClientsPage.jsx       # Directorio de clientes
│   │   │   └── SupportNotesPage.jsx  # Notas + editor TipTap + IA
│   │   ├── components/
│   │   │   ├── Layout.jsx    # Sidebar desktop + nav mobile
│   │   │   └── ui/           # Badge, Button, Modal, SearchInput, etc.
│   │   └── assets/
│   ├── index.html
│   ├── vite.config.js        # Alias `@/` apunta a `./src`
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── eslint.config.js
├── cloudflare/
│   └── cloudflared-windows-amd64.exe  # Tunnel para exponer localhost
├── run_app_optimized.bat     # Build e inicio completo
├── run_cloudflare_tunnel.bat # Inicia tunnel en puerto 5002
├── run_notifications.bat     # CURL a check-all (para Task Scheduler)
└── pendientes2.0.sln
```

---

## Convenciones de Código

### Backend (C#)

- **Idioma**: español para nombres de entidades, propiedades, comentarios y mensajes de respuesta.
- **Serialización JSON**: usa `SnakeCaseLower` en `Program.cs` (`PropertyNamingPolicy`).
- **Entidades**: atributos `[Table("nombre")]` y `[Column("nombre")]` en snake_case para mapear a SQLite.
- **DTOs**: definidos como clases públicas al final del archivo del controller (no en carpeta separada).
- **Bool en SQLite**: se guardan como `int` (0/1) usando `.HasConversion<int>()` en `OnModelCreating`.
- **Controllers**: heredan de `ControllerBase`, rutas con `[Route("api/[controller]")]` o `[Route("api/...")]`.

### Frontend (React + JSX)

- **Idioma**: español para toda la interfaz y variables de estado.
- **Componentes**: funcionales, con hooks (`useState`, `useEffect`, `useRef`, `useCallback`).
- **Estilos**: Tailwind utility classes. Paleta oscura dominante (`slate-900`, `emerald-500/600`).
- **Iconos**: `lucide-react`.
- **Toasts**: `sonner` con `toast.success()`, `toast.error()`, `toast.loading()`.
- **API**: centralizado en `src/api.js` usando Axios con `baseURL` condicional según `import.meta.env.PROD`.

---

## Proceso de Build y Ejecución

### Requisitos

- .NET 8 SDK
- Node.js + npm
- Windows (los scripts `.bat` son para Windows; el backend corre en cualquier SO con .NET)

### Comandos principales

**1. Build completo e iniciar (modo producción local):**

```batch
run_app_optimized.bat
```

Este script:
1. Ejecuta `npm install` en `frontend/`.
2. Ejecuta `npm run build` (Vite genera `frontend/dist/`).
3. Limpia y copia `frontend/dist/*` a `backend/wwwroot/`.
4. Ejecuta `dotnet run` en `backend/` escuchando en `http://*:5002`.

**2. Solo backend (si ya hay archivos estáticos):**

```bash
cd backend
dotnet run
```

**3. Solo frontend en modo desarrollo (con HMR):**

```bash
cd frontend
npm run dev
```

El frontend en dev apunta a `http://localhost:5002/api` vía `api.js`.

**4. Cloudflare Tunnel (exponer a internet):**

```batch
run_cloudflare_tunnel.bat
```

Usa el binario `cloudflared-windows-amd64.exe` para crear un tunnel a `http://localhost:5002`.

---

## Configuración

### Jerarquía de archivos de configuración

1. `appsettings.json` — valores por defecto (en Git).
2. `appsettings.Development.json` — solo en modo desarrollo (en Git).
3. `appsettings.local.json` — **configuración local/sensible, NO está en Git**.

### Valores críticos en `appsettings.local.json`

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

- **`BaseUrl`**: IP o dominio accesible desde la red. Es **crítico** para que los enlaces de los correos funcionen desde otras PCs.
- **`Email:SenderPassword`**: contraseña de aplicación de Gmail (no la contraseña normal).
- **`AI:ApiKey`**: API key de Groq (`gsk_...`).

Ver `backend/CONFIG.md` para instrucciones detalladas de configuración de red y firewall.

---

## Arquitectura de la Base de Datos

SQLite (`pendientes.db`). Tablas principales:

| Tabla | Entidad | Descripción |
|-------|---------|-------------|
| `pendientes` | `Pendiente` | Tareas principales con fecha límite, estado, email, CC |
| `pendiente_tasks` | `PendienteTask` | Sub-tareas de un pendiente |
| `clientes` | `Cliente` | Empresas/clientes |
| `client_tasks` | `ClientTask` | Tareas asociadas a un cliente |
| `support_notes` | `SupportNote` | Notas de soporte (contenido HTML) |
| `support_note_images` | `SupportNoteImage` | Imágenes adjuntas a notas |
| `ai_chat_history` | `AiChatMessage` | Historial de conversaciones con IA |
| `__EFMigrationsHistory` | — | Historial de migraciones EF Core |

### Migraciones y Schema Patches

En `Program.cs` hay un mecanismo híbrido:

1. Al iniciar se ejecuta `context.Database.MigrateAsync()`.
2. Si falla por tablas ya existentes (legado de `EnsureCreated()`), se hace *seed* de la historia de migraciones.
3. Luego se aplican **patches DDL seguros** (`IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`) para tablas/columnas que pueden no existir en DBs antiguas.

> **Regla**: si necesitas agregar una columna nueva sin migración formal, agrégala en `ApplySafeSchemaPatches` en `Program.cs`.

---

## Endpoints de la API (resumen)

### Pendientes
- `GET    /api/pendientes`
- `POST   /api/pendientes`
- `PUT    /api/pendientes/{id}`
- `DELETE /api/pendientes/{id}`
- `GET    /api/pendientes/{id}/complete-all-tasks` — redirige al frontend

### Tareas de Pendiente
- `GET    /api/pendientes/{pendienteId}/tasks`
- `POST   /api/pendientes/{pendienteId}/tasks`
- `POST   /api/pendientes/{pendienteId}/tasks/bulk`
- `PUT    /api/pendientes/{pendienteId}/tasks/{taskId}`
- `DELETE /api/pendientes/{pendienteId}/tasks/{taskId}`
- `POST   /api/pendientes/{pendienteId}/complete`

### Clientes
- `GET    /api/clientes`
- `POST   /api/clientes`
- `POST   /api/clientes/bulk`
- `PUT    /api/clientes/{id}`
- `DELETE /api/clientes/{id}`

### Tareas de Cliente
- `GET    /api/clients/{clientId}/tasks`
- `POST   /api/clients/{clientId}/tasks`
- `POST   /api/clients/{clientId}/tasks/bulk`
- `PUT    /api/tasks/{id}`
- `DELETE /api/tasks/{id}`
- `POST   /api/tasks/global`
- `POST   /api/clients/{clientId}/create-pending-tasks`

### Notas de Soporte
- `GET    /api/supportnotes`
- `GET    /api/supportnotes/{id}`
- `POST   /api/supportnotes`
- `PUT    /api/supportnotes/{id}`
- `DELETE /api/supportnotes/{id}`
- `POST   /api/supportnotes/{noteId}/images`
- `GET    /api/supportnotes/images/{imageId}`
- `DELETE /api/supportnotes/images/{imageId}`
- `GET    /api/supportnotes/{noteId}/images`
- `POST   /api/supportnotes/{id}/content`

### Notificaciones
- `POST   /api/notify/{id}` — envía correo manual
- `POST   /api/notifications/check-all` — verifica fechas límite y envía correos automáticos

### IA (Groq / Llama)
- `GET    /api/ai/history`
- `DELETE /api/ai/history`
- `POST   /api/ai/ask`

### Base de Datos / Respaldo
- `POST   /api/database/backup` — disparar respaldo manual
- `GET    /api/database/status` — conteos por tabla
- `GET    /api/database/export/{tabla}` — CSV
- `POST   /api/database/import/{tabla}` — CSV

---

## Lógica de Negocio Importante

### Sincronización Pendiente ↔ Cliente

Cuando un `Pendiente` tiene `empresa` coincidente con un `Cliente`:

- Al crear/editar un pendiente, sus tareas pendientes se sincronizan como `ClientTask` del cliente.
- Al completar tareas de un pendiente, se actualiza el estado del cliente (`Pendiente`, `En Curso`, `Finalizado`).
- Completar un pendiente marca su estado como `Finalizado` y limpia las tareas del cliente.

### Notificaciones por Correo

- Se envían a `email_notificacion` con copia a `cc_emails` (separados por coma).
- El correo incluye un botón que redirige a `BaseUrl/?pendiente={id}`.
- `CheckAllNotifications` omite fines de semana y envía correos solo si faltan `dias_antes_notificacion` o menos (o está vencido por 1 día).

### Respaldo Automático

`DatabaseBackupService` (BackgroundService) corre cada domingo a las 2:00 AM:

- Exporta cada tabla a CSV (separador `;`) en `backend/Backups/backup_YYYYMMDD_HHMMSS/`.
- Hace `VACUUM INTO` del archivo SQLite completo como `.bak`.

### IA y Notas de Soporte

- La IA usa la API de **Groq** (`llama-3.3-70b-versatile`) con endpoint OpenAI-compatible.
- Antes de consultar, el backend filtra las notas relevantes por palabras clave (stopwords en español/inglés) para no exceder límites de tokens.
- El historial de chat se persiste en `ai_chat_history`.

---

## Testing

**El proyecto no tiene tests unitarios ni de integración actualmente.**

Para verificar funcionalidad se usa:

- Swagger UI en desarrollo: `http://localhost:5002/swagger`
- Scripts `.bat` manuales (`run_notifications.bat`).
- Importación/exportación CSV como mecanismo de validación de datos.

---

## Consideraciones de Seguridad

- **Sin autenticación ni autorización**: la app es de uso interno/oficina. Cualquiera con acceso a la red puede usar la API.
- **CORS**: permite cualquier origen (`AllowAnyOrigin`).
- **Credenciales**: `SenderPassword` de Gmail y `AI:ApiKey` se almacenan en texto plano en `appsettings.local.json`.
- **Subida de archivos**: limitada a 5MB y tipos de imagen (`jpeg`, `png`, `gif`, `webp`). Las imágenes se guardan en `wwwroot/uploads/support-notes/`.
- **HTML en notas**: el contenido de `SupportNote.Content` es HTML del editor TipTap. No hay sanitización implementada actualmente (comentado en el controller).
- **Base de datos SQLite**: archivo local sin encriptación.

---

## Flujos de Desarrollo Comunes

### Agregar una nueva propiedad a una entidad existente

1. Modifica la clase en `backend/Models/Entities.cs`.
2. Crea una migración de EF Core:
   ```bash
   cd backend
   dotnet ef migrations add NombreDeLaMigracion
   ```
3. Alternativamente, para compatibilidad con DBs antiguas sin re-crear, agrega un patch en `ApplySafeSchemaPatches` en `Program.cs`.

### Agregar un nuevo endpoint

1. Agrega la acción en el controller correspondiente en `backend/Controllers/`.
2. Agrega la función en `frontend/src/api.js`.
3. Usa la función en el componente de página correspondiente.

### Modificar la UI

- Las 3 páginas principales están en `frontend/src/pages/`. Cada una es un componente grande con múltiples sub-componentes internos.
- Los componentes reutilizables están en `frontend/src/components/ui/`.
- Los estilos globales y custom (scrollbars, TipTap) están en `frontend/src/index.css`.

### Desplegar en producción (modo oficina)

1. Configura `appsettings.local.json` con la IP local en `BaseUrl`.
2. Abre el puerto 5002 en el firewall de Windows.
3. Ejecuta `run_app_optimized.bat`.
4. (Opcional) Ejecuta `run_cloudflare_tunnel.bat` para acceso remoto.
5. (Opcional) Programa `run_notifications.bat` en el *Programador de Tareas de Windows* para enviar recordatorios automáticos.

---

## Notas para Agentes de IA

- **No asumas frameworks que no están**: no hay Docker, no hay CI/CD, no hay tests, no hay TypeScript.
- **Respeta el idioma español**: todo código nuevo, comentarios, mensajes de error y UI deben mantenerse en español.
- **Mantén consistencia visual**: la UI usa un tema oscuro con acentos `emerald` y `slate`. Las páginas de clientes son la excepción (usan fondo blanco con acentos `emerald`).
- **Cuidado con `appsettings.local.json`**: nunca lo subas a Git. Si creas un ejemplo, nómbralo `appsettings.local.json.example`.
- **SQLite es el único motor de BD**: no escribas SQL específico de PostgreSQL o SQL Server.
- **El frontend se despliega como estáticos**: la API y el frontend corren en el mismo puerto (`5002`). No esperes que el frontend tenga su propio servidor en producción.
