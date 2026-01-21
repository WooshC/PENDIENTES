# Configuración del Backend

## 🚀 Inicio Rápido

### 1. Configuración Local

Crea tu archivo de configuración local:

```bash
# Copia el archivo de ejemplo
cp appsettings.local.json.example appsettings.local.json
```

### 2. Configurar BaseUrl

El `BaseUrl` es **crítico** para que los correos funcionen correctamente en toda la red.

#### Obtener tu IP Local

**Windows:**
```powershell
ipconfig
```
Busca "Dirección IPv4", por ejemplo: `192.168.0.13`

**Linux/Mac:**
```bash
ifconfig
# o
ip addr show
```

#### Actualizar appsettings.local.json

```json
{
  "BaseUrl": "http://192.168.0.13:5002",  // ⬅️ Cambia esta IP
  "Email": {
    "SmtpServer": "smtp.gmail.com",
    "SmtpPort": "587",
    "SenderEmail": "tu-email@gmail.com",
    "SenderPassword": "tu-app-password"
  }
}
```

### 3. Configurar Email (Gmail)

1. Ve a https://myaccount.google.com/apppasswords
2. Genera una contraseña de aplicación para "Correo"
3. Copia la contraseña de 16 caracteres
4. Actualiza `SenderEmail` y `SenderPassword` en `appsettings.local.json`

### 4. Configurar Firewall (Windows)

Para que otras PCs puedan acceder:

1. **Windows Defender Firewall** → Configuración avanzada
2. **Reglas de entrada** → Nueva regla
3. **Puerto** → TCP → `5002`
4. **Permitir la conexión**
5. Nombre: `Pendientes Backend`

### 5. Ejecutar

```bash
dotnet run
```

La aplicación estará disponible en:
- **Localmente**: http://localhost:5002
- **En la red**: http://TU-IP:5002 (ej: http://192.168.0.13:5002)

---

## 📧 ¿Por qué es importante el BaseUrl?

### Problema sin BaseUrl

Cuando se envía un correo con el botón "Marcar Todas como Completadas":

```
❌ Link generado: http://localhost:5002/api/pendientes/5/complete-all-tasks
```

**Resultado**: Solo funciona en la PC del servidor, no en otras PCs de la oficina.

### Solución con BaseUrl

```
✅ Link generado: http://192.168.0.13:5002/api/pendientes/5/complete-all-tasks
```

**Resultado**: Funciona desde cualquier PC en la red local.

---

## 🔧 Jerarquía de Configuración

Los archivos se cargan en este orden (el último sobrescribe al anterior):

1. **`appsettings.json`** - Configuración base
2. **`appsettings.Development.json`** - Solo en modo desarrollo
3. **`appsettings.local.json`** - Tu configuración personal (no se sube a Git)

### Ejemplo

**appsettings.json** (en Git):
```json
{
  "BaseUrl": "http://localhost:5002"
}
```

**appsettings.local.json** (NO en Git):
```json
{
  "BaseUrl": "http://192.168.0.13:5002"
}
```

**Resultado final**: Se usa `http://192.168.0.13:5002`

---

## 📝 Archivos de Configuración

| Archivo | Propósito | En Git |
|---------|-----------|--------|
| `appsettings.json` | Configuración base | ✅ Sí |
| `appsettings.Development.json` | Configuración de desarrollo | ✅ Sí |
| `appsettings.local.json.example` | Plantilla de ejemplo | ✅ Sí |
| `appsettings.local.json` | Tu configuración real | ❌ No (.gitignore) |

---

## 🌐 Escenarios de Uso

### Desarrollo Local (Solo tu PC)

```json
{
  "BaseUrl": "http://localhost:5002"
}
```

### Red de Oficina (Múltiples PCs)

```json
{
  "BaseUrl": "http://192.168.0.13:5002"
}
```

### Servidor Público (Internet)

```json
{
  "BaseUrl": "https://tu-dominio.com"
}
```

---

## ⚠️ Problemas Comunes

### El botón del correo no funciona desde otra PC

**Causa**: BaseUrl está configurado como `localhost`  
**Solución**: Actualiza `appsettings.local.json` con tu IP local

### No puedo acceder desde otra PC

**Causa**: Firewall bloqueando el puerto 5002  
**Solución**: Configura una regla de entrada en Windows Firewall

### Los correos no se envían

**Causa**: Credenciales de Gmail incorrectas  
**Solución**: Genera una nueva App Password en Google

---

## 📚 Más Información

- [Documentación de ASP.NET Configuration](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/configuration/)
- [Gmail App Passwords](https://support.google.com/accounts/answer/185833)
