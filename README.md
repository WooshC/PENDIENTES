# 📋 TaskFlow Pro v2.1.0

**Sistema de Gestión Inteligente de Tareas y Clientes**

> Versión mejorada de Pendientes 1.0 con arquitectura moderna, diseño responsive y preparado para integración con IA.

---

## 🚀 Características Principales

### ✅ Gestión de Tareas (Pendientes)
- Crear, editar y eliminar mensajes/recordatorios
- Estados: Pendiente, En Curso, Completado
- Notificaciones por email con CC
- Fechas límite y alertas automáticas
- Búsqueda y filtrado avanzado

### Sistema de Notificaciones Mejorado
- **Correos HTML profesionales** con diseño moderno
- **Parsing automático** de Observaciones y Tareas
- **Secciones visuales** separadas con colores distintivos
- **Botón interactivo** "Marcar Todas como Completadas" desde el correo
- **Badges de urgencia** con colores según tiempo restante
- **Configuración de red** para acceso desde cualquier PC en la oficina

### 👥 Gestión de Clientes
- Directorio completo de empresas/clientes
- Tareas asociadas a cada cliente
- Estados de progreso (Sin Tareas, Pendiente, En Curso, Finalizado)
- Observaciones y procedimientos
- **Descripción editable** antes de convertir a pendientes
- Conversión de tareas a pendientes con notificación

### 📊 Características Avanzadas
- **Tareas Globales**: Asignar una tarea a múltiples clientes simultáneamente
- **Excel Import/Export**: Importar/exportar datos de clientes
- **Plantillas**: Descargar plantilla Excel para carga masiva
- **Responsive Design**: Funciona perfectamente en móvil, tablet y desktop
- **Navegación Móvil**: Barra de navegación inferior en dispositivos móviles

### 🔮 Preparado para el Futuro
- Estructura lista para integración con IA (DeepSeek/Ollama)
- Sistema de notas de soluciones (próximamente)
- Base de conocimiento técnico (próximamente)

---

## 🏗️ Arquitectura del Proyecto

```
PENDIENTES/
├── pendientes2.0/
│   ├── backend/                    # API REST en .NET 8
│   │   ├── Controllers/            # Endpoints de la API
│   │   │   ├── PendientesController.cs
│   │   │   ├── ClientesController.cs
│   │   │   ├── ClientTasksController.cs
│   │   │   └── NotifyController.cs
│   │   ├── Data/                   # Contexto de base de datos
│   │   │   └── AppDbContext.cs
│   │   ├── Models/                 # Entidades del dominio
│   │   │   └── Entities.cs
│   │   ├── Services/               # Lógica de negocio
│   │   │   ├── IEmailService.cs
│   │   │   ├── EmailService.cs
│   │   │   ├── IEmailTemplateService.cs
│   │   │   └── EmailTemplateService.cs  # Plantillas HTML para emails
│   │   ├── Properties/
│   │   │   └── launchSettings.json
│   │   ├── appsettings.json        # Configuración pública
│   │   ├── appsettings.local.json.example  # Plantilla para credenciales
│   │   ├── Program.cs              # Punto de entrada
│   │   └── Backend.csproj
│   │
│   ├── frontend/                   # SPA en React + Vite
│   │   ├── public/
│   │   │   └── favicon.svg         # Logo de TaskFlow Pro
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   └── Layout.jsx      # Layout principal con navegación
│   │   │   ├── pages/
│   │   │   │   ├── PendingPage.jsx # Gestión de pendientes
│   │   │   │   └── ClientsPage.jsx # Gestión de clientes
│   │   │   ├── api.js              # Cliente HTTP (Axios)
│   │   │   ├── App.jsx             # Componente raíz
│   │   │   ├── main.jsx            # Punto de entrada
│   │   │   └── index.css           # Estilos globales
│   │   ├── index.html
│   │   ├── package.json
│   │   └── vite.config.js
│   │
│   ├── cloudflare/
│   │   └── cloudflared-windows-amd64.exe
│   │
│   ├── run_app_optimized.bat       # Script para ejecutar la app
│   ├── run_cloudflare_tunnel.bat   # Script para túnel público
│   └── pendientes.db                # Base de datos SQLite
│
└── .gitignore
```

---

## 🛠️ Stack Tecnológico

### Backend
- **Framework**: ASP.NET Core 8.0
- **Base de Datos**: SQLite con Entity Framework Core
- **Email**: MailKit para notificaciones SMTP
- **API**: RESTful con JSON (snake_case)
- **CORS**: Configurado para desarrollo local

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **UI/Animations**: Framer Motion
- **Notifications**: Sonner (toast notifications)
- **Icons**: Lucide React
- **Styling**: Tailwind CSS (utility-first)
- **Excel**: SheetJS (xlsx)

### DevOps
- **Túnel**: Cloudflare Tunnel para acceso remoto
- **Deployment**: Build estático servido por ASP.NET

---

## 📦 Instalación y Configuración

### Requisitos Previos

- **.NET 8 SDK**: [Descargar aquí](https://dotnet.microsoft.com/download/dotnet/8.0)
- **Node.js 18+**: [Descargar aquí](https://nodejs.org/)
- **Git**: [Descargar aquí](https://git-scm.com/)

### 1. Clonar el Repositorio

```bash
git clone https://github.com/TU_USUARIO/PENDIENTES.git
cd PENDIENTES/pendientes2.0
```

### 2. Configurar Credenciales de Email

⚠️ **IMPORTANTE**: Las credenciales NO están en el repositorio por seguridad.

1. Copia el archivo de ejemplo:
   ```bash
   cd backend
   copy appsettings.local.json.example appsettings.local.json
   ```

2. Edita `appsettings.local.json` con tus credenciales **Y tu IP local**:
   ```json
   {
     "BaseUrl": "http://TU-IP-LOCAL:5002",
     "Email": {
       "SmtpServer": "smtp.gmail.com",
       "SmtpPort": "587",
       "SenderEmail": "tu-email@gmail.com",
       "SenderPassword": "tu-contraseña-de-aplicacion"
     }
   }
   ```

   **Importante sobre BaseUrl**:
   - Obtén tu IP local con `ipconfig` (Windows) o `ifconfig` (Linux/Mac)
   - Ejemplo: `"BaseUrl": "http://192.168.0.13:5002"`
   - Esto permite que los links en los correos funcionen desde cualquier PC en la oficina
   - Si solo usarás la app localmente, usa: `"BaseUrl": "http://localhost:5002"`

3. **Obtener contraseña de aplicación de Gmail**:
   - Ve a [https://myaccount.google.com/security](https://myaccount.google.com/security)
   - Activa "Verificación en 2 pasos"
   - Ve a "Contraseñas de aplicaciones"
   - Genera una nueva contraseña para "Correo"
   - Usa esa contraseña en `SenderPassword`

### 3. Instalar Dependencias del Frontend

```bash
cd frontend
npm install
```

### 4. Ejecutar la Aplicación

#### Opción A: Modo Desarrollo (Recomendado para desarrollo)

**Terminal 1 - Backend:**
```bash
cd backend
dotnet run
```
El backend estará en: `http://localhost:5002`

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
El frontend estará en: `http://localhost:5173`

#### Opción B: Modo Producción (Build optimizado)

```bash
# Desde la raíz de pendientes2.0
.\run_app_optimized.bat
```

Esto hará:
1. Build del frontend
2. Copia de archivos estáticos al backend
3. Inicio del servidor en `http://localhost:5002`

---

## 🌐 Acceso Remoto con Cloudflare Tunnel

Para que otros accedan a tu aplicación desde internet:

```bash
.\run_cloudflare_tunnel.bat
```

Te dará una URL pública tipo: `https://random-name.trycloudflare.com`

---

## 🔧 Configuración Avanzada

### Cambiar Puerto del Backend

Edita `backend/Properties/launchSettings.json`:
```json
{
  "applicationUrl": "http://*:5002"
}
```

O en `backend/Program.cs`:
```csharp
builder.WebHost.UseUrls("http://*:TU_PUERTO");
```

### Acceso en Red Local (Oficina/WiFi)

El backend ya está configurado para escuchar en todas las interfaces (`http://*:5002`).

**Obtén tu IP local:**
```bash
ipconfig
```

**Comparte con tus compañeros:**
```
http://192.168.X.X:5002
```

**Configurar Firewall de Windows:**
```bash
# Ejecutar como Administrador
netsh advfirewall firewall add rule name="TaskFlow Backend" dir=in action=allow protocol=TCP localport=5002
```

**Configurar BaseUrl para Red Local:**

Para que los correos funcionen desde cualquier PC:

1. Obtén tu IP local:
   ```bash
   ipconfig
   ```
   Ejemplo: `192.168.0.13`

2. Actualiza `backend/appsettings.local.json`:
   ```json
   {
     "BaseUrl": "http://192.168.0.13:5002"
   }
   ```

3. Reinicia el backend

Ahora los correos tendrán links que funcionan desde cualquier PC en la red.

> 📖 **Más detalles**: Ver `backend/CONFIG.md` para documentación completa de configuración.

---

## � Sistema de Correos Mejorado

### Características del Email HTML

Los correos ahora tienen un diseño profesional con:

#### 🎨 Diseño Visual
- **Header con gradiente morado** (#667eea → #764ba2)
- **Secciones separadas** con colores distintivos
- **Responsive** - Se ve bien en móvil y desktop
- **Badges de urgencia** con colores según tiempo restante

#### 📋 Parsing Automático de Descripción

El sistema detecta automáticamente las secciones en la descripción del pendiente.

**Ejemplo de entrada:**
```
Observaciones:
Hay que crear el IR y las tablas del 2026

Tareas:
- Crear formula I.R
- Crear tablas 2026
```

**Resultado en el correo:**
- Caja azul con las observaciones
- Caja verde con lista de tareas (viñetas)
- Botón verde "Marcar Todas como Completadas"

#### ⚡ Botón Interactivo

Al hacer clic en "Marcar Todas como Completadas":

1. ✅ **Pendiente** → Cambia a estado "Finalizado"
2. ✅ **Cliente** → Marca como completado (`check_estado = true`)
3. ✅ **Tareas del Cliente** → Se eliminan todas
4. ✅ **Confirmación** → Muestra página de éxito

#### 🎯 Badges de Urgencia

- 🔴 **Rojo**: Vence hoy o ya venció
- 🟡 **Amarillo**: Vence en 2-3 días
- 🔵 **Azul**: Vence en más de 3 días

### Flujo de Trabajo

1. **Crear Pendiente desde Cliente:**
   - En la página de Clientes, click en "Convertir a Pendientes"
   - Edita la descripción (se pre-llena con observaciones y tareas)
   - Formato: `Observaciones:\n...\n\nTareas:\n- ...`
   - Completa email, días y fecha límite

2. **Sistema envía correo con:**
   - Secciones visuales separadas
   - Badge de urgencia
   - Botón interactivo

3. **Usuario completa desde el correo:**
   - Click en el botón
   - Todo se actualiza automáticamente

---

## �📊 Base de Datos

### Estructura de Tablas

#### `pendientes`
- Mensajes/recordatorios con notificaciones
- Campos: id, fecha, actividad, descripcion, empresa, estado, email_notificacion, cc_emails, etc.

#### `clientes`
- Directorio de empresas/clientes
- Campos: id, empresa, observaciones, procedimiento, estado, check_estado

#### `client_tasks`
- Tareas asociadas a cada cliente
- Campos: id, client_id, description, completed, created_at

### Backup de la Base de Datos

```bash
# Copiar el archivo
copy pendientes.db pendientes_backup_YYYY-MM-DD.db
```

### Resetear Base de Datos

```bash
# Eliminar la base de datos actual
del pendientes.db

# Ejecutar el backend para recrearla
cd backend
dotnet run
```

---

## 🎨 Personalización

### Cambiar Nombre de la Aplicación

**Frontend:**
- `frontend/index.html` - Título de la página
- `frontend/src/components/Layout.jsx` - Logo del sidebar

**Favicon:**
- `frontend/public/favicon.svg`

### Colores y Tema

Edita `frontend/src/index.css` para cambiar:
- Colores primarios
- Gradientes
- Fuentes

---

## 🐛 Troubleshooting

### Error: "No se puede cargar el archivo npm.ps1"

**Solución:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
```

O usa CMD en lugar de PowerShell.

### Error: "Puerto 5002 ya está en uso"

**Solución:**
```bash
# Encontrar el proceso
netstat -ano | findstr :5002

# Matar el proceso (reemplaza PID)
taskkill /PID XXXX /F
```

### Error: "CORS policy"

Verifica que el frontend esté configurado para apuntar al backend correcto en `frontend/src/api.js`:
```javascript
const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:5002/api';
```

### Emails no se envían

1. Verifica que `appsettings.local.json` exista y tenga las credenciales correctas
2. Asegúrate de usar una "Contraseña de aplicación" de Gmail, no tu contraseña normal
3. Verifica que la verificación en 2 pasos esté activa en tu cuenta de Gmail

### Error: "The data is NULL at ordinal..." o 500 Internal Server Error

Este error ocurre cuando hay datos NULL en campos requeridos de la base de datos.

**Solución 1 - Resetear BD (si no tienes datos importantes):**
```bash
cd backend
del pendientes.db
del pendientes.db-shm
del pendientes.db-wal
dotnet run  # Recreará la BD limpia
```

**Solución 2 - Arreglar datos corruptos (si tienes datos importantes):**
```sql
-- Usa un cliente SQLite o: sqlite3 pendientes.db

-- Arreglar actividades NULL
UPDATE pendientes 
SET actividad = 'Sin título' 
WHERE actividad IS NULL;

-- Arreglar fechas NULL
UPDATE pendientes 
SET fecha = date('now') 
WHERE fecha IS NULL;
```

**Prevención**: El modelo ahora tiene valores por defecto para evitar este error en el futuro.

### Botón "Marcar Todas como Completadas" no funciona desde otra PC

**Causa**: El `BaseUrl` está configurado como `localhost`

**Solución**:
1. Obtén tu IP local con `ipconfig`
2. Actualiza `backend/appsettings.local.json`:
   ```json
   {
     "BaseUrl": "http://TU-IP:5002"
   }
   ```
3. Reinicia el backend

**Ejemplo**: Si tu IP es `192.168.0.13`, usa `"BaseUrl": "http://192.168.0.13:5002"`

---

## 📈 Roadmap v2.2 (Próximamente)

- [ ] Sistema de notas de soluciones técnicas
- [ ] Integración con IA (DeepSeek/Ollama local)
- [ ] Base de conocimiento con búsqueda semántica
- [ ] Autenticación y usuarios múltiples
- [ ] Dashboard con estadísticas
- [ ] Modo oscuro/claro
- [ ] PWA (instalable en móvil)
- [ ] Notificaciones push

---

## 📝 Notas de Migración desde v1.0

### Principales Mejoras

1. **Arquitectura**: Python Flask → .NET 8 (mejor rendimiento)
2. **Frontend**: HTML/JS básico → React + Vite (SPA moderna)
3. **Base de Datos**: Mejor estructura con relaciones
4. **UI/UX**: Diseño completamente renovado y responsive
5. **Funcionalidades**: Tareas globales, Excel, navegación móvil

### Migrar Datos de v1.0

Si tienes datos en la versión 1.0, necesitarás:
1. Exportar datos de la BD antigua
2. Adaptar el esquema al nuevo formato
3. Importar usando la funcionalidad de Excel o API

---

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

---

## 📄 Licencia

Este proyecto es de uso interno. Todos los derechos reservados.

---

## 👨‍💻 Autor

**Woosh_C/Moisés**
- Email: moisesisraelarequipam@gmail.com

---

## 🙏 Agradecimientos

- **Frameworks**: ASP.NET Core, React, Vite
- **Librerías**: Framer Motion, Sonner, Lucide Icons
- **Infraestructura**: Cloudflare Tunnel

---

**Versión**: 2.1.0 - Email Features Update  
**Última actualización**: Enero 2026
