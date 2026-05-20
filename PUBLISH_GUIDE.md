# Guía Completa: Publicar Paquetes en npm

**Última actualización**: 2026-05-20  
**Paquetes a publicar**: @cai-ds/tokens, @cai-ds/core, @cai-ds/platform

---

## 📋 Requisitos Previos

### 1. Cuenta en npm
- Visita: https://www.npmjs.com/signup
- Crea una cuenta personal o usa una existente
- **Verifica tu correo electrónico**

### 2. Organización en npm (OBLIGATORIO para scope `@cai-ds/`)
- Visita: https://www.npmjs.com/org/create
- Nombre de organización: `cai-ds`
- Tipo: **Free** (gratuita para paquetes open source)
- Tu usuario debe ser miembro de la org

### 3. Node.js y pnpm
```powershell
# Verificar versiones
node --version    # Debe ser >= 18.0.0 (recomendado: 20.x)
pnpm --version    # Debe ser >= 9.0.0
```

**Instalar si falta:**
- Node.js: https://nodejs.org/ (descarga LTS o v20)
- pnpm: `npm install -g pnpm@9`

---

## 🔧 Paso 1: Preparar el Repositorio Local

### 1.1 Verificar cambios no guardados
```powershell
cd c:\Users\mago\Documents\LeadFront\repos-github\cai
git status
```

**Acción**: Asegúrate de que no hay cambios sin commitear. Si los hay:
```powershell
git add .
git commit -m "Changes before npm publish"
```

### 1.2 Verificar rama
```powershell
git branch
# Deberías estar en: main o la rama de producción
```

### 1.3 Actualizar desde remoto
```powershell
git pull origin main
```

---

## 🔐 Paso 2: Autenticar con npm

### 2.1 Iniciar sesión en npm
```powershell
npm login
```

**Se te pedirá:**
1. **Username**: Tu nombre de usuario en npm
2. **Password**: Tu contraseña
3. **Email**: Tu correo registrado
4. **OTP (One-Time Password)**: Código de 2FA si lo tienes habilitado

**Importante:**
- Si tienes 2FA habilitado, necesitarás un código de autenticación
- El código aparecerá en tu app de autenticación o correo

### 2.2 Verificar autenticación
```powershell
npm whoami
```

**Debería mostrar tu nombre de usuario.**

### 2.3 Verificar permisos de organización
```powershell
npm access list teams org cai-ds
```

**Deberías ver tu usuario listado como miembro.**

---

## 🏗️ Paso 3: Preparar y Validar los Paquetes

### 3.1 Instalar dependencias
```powershell
cd c:\Users\mago\Documents\LeadFront\repos-github\cai
pnpm install
```

### 3.2 Regenerar los dist/
```powershell
pnpm build
```

**Debe completar sin errores.** Verifica:
- ✓ `packages/tokens/dist/` existe y contiene `cai-tokens.css`
- ✓ `packages/core/dist/` existe y contiene `cai.css`, `cai.js`, `themes/`
- ✓ `packages/platform/dist/` existe y contiene `platform.css`

### 3.3 Simular publicación (validar manifest)
```powershell
cd packages/tokens
npm pack --dry-run
cd ../..
```

**Verifica que el output muestre:**
- Archivos en `dist/`
- Tamaño razonable (>100KB para tokens)
- Sin advertencias de seguridad

```powershell
cd packages/core
npm pack --dry-run
cd ../..
```

```powershell
cd packages/platform
npm pack --dry-run
cd ../..
```

---

## 🚀 Paso 4: Publicar los Paquetes

### ⚠️ ORDEN IMPORTANTE
Debes publicar en este orden exacto:
1. **tokens** (base de todo)
2. **core** (depende de tokens)
3. **platform** (depende de core y tokens)

### 4.1 Publicar @cai-ds/tokens@2.0.0-beta.1

```powershell
cd c:\Users\mago\Documents\LeadFront\repos-github\cai\packages\tokens
npm publish --tag beta --access public
```

**Salida esperada:**
```
npm notice Publishing to registry with tag beta
npm notice Publishing @cai-ds/tokens@2.0.0-beta.1
npm notice
npm notice + @cai-ds/tokens@2.0.0-beta.1
```

**Verifica:**
```powershell
npm view @cai-ds/tokens@2.0.0-beta.1
```

Deberías ver la información del paquete con:
- `"dist-tags": { "beta": "2.0.0-beta.1", ... }`
- `files` con `dist/cai-tokens.css` y fuentes

### 4.2 Esperar indexación de CDN (1-5 minutos)

```powershell
# Mientras esperas, puedes verificar el paquete en npm
npm view @cai-ds/tokens dist.tarball
```

Visita también en el navegador:
- https://www.npmjs.com/package/@cai-ds/tokens

---

### 4.3 Publicar @cai-ds/core@2.0.0

```powershell
cd c:\Users\mago\Documents\LeadFront\repos-github\cai\packages\core
npm publish --access public
```

**Salida esperada:**
```
npm notice Publishing to registry with tag latest
npm notice Publishing @cai-ds/core@2.0.0
npm notice
npm notice + @cai-ds/core@2.0.0
```

**Verifica:**
```powershell
npm view @cai-ds/core@2.0.0
```

---

### 4.4 Esperar indexación de CDN (1-5 minutos)

```powershell
npm view @cai-ds/core dist.tarball
```

Visita:
- https://www.npmjs.com/package/@cai-ds/core

---

### 4.5 Publicar @cai-ds/platform@2.0.0

```powershell
cd c:\Users\mago\Documents\LeadFront\repos-github\cai\packages\platform
npm publish --access public
```

**Salida esperada:**
```
npm notice Publishing to registry with tag latest
npm notice Publishing @cai-ds/platform@2.0.0
npm notice
npm notice + @cai-ds/platform@2.0.0
```

**Verifica:**
```powershell
npm view @cai-ds/platform@2.0.0
```

---

## ✅ Paso 5: Verificar Publicación en CDN

### 5.1 Esperar indexación completa (3-10 minutos)

jsDelivr puede tomar hasta 10 minutos para indexar nuevos paquetes de npm.

### 5.2 Probar URLs en el navegador

Abre cada URL en una pestaña del navegador o usa curl:

```powershell
# Tokens
curl -I "https://cdn.jsdelivr.net/npm/@cai-ds/tokens@2.0.0-beta.1/dist/cai-tokens.css"

# Core CSS
curl -I "https://cdn.jsdelivr.net/npm/@cai-ds/core@2.0.0/dist/cai.css"

# Core JS
curl -I "https://cdn.jsdelivr.net/npm/@cai-ds/core@2.0.0/dist/cai.js"

# Platform
curl -I "https://cdn.jsdelivr.net/npm/@cai-ds/platform@2.0.0/dist/platform.css"

# Themes
curl -I "https://cdn.jsdelivr.net/npm/@cai-ds/core@2.0.0/dist/themes/cai-theme-minimalist.css"
curl -I "https://cdn.jsdelivr.net/npm/@cai-ds/core@2.0.0/dist/themes/cai-theme-ricardoymortimer.css"
```

**Resultado esperado: HTTP 200 OK**

### 5.3 Verificación rápida en JavaScript

```javascript
// Abre la consola del navegador y ejecuta:
fetch('https://cdn.jsdelivr.net/npm/@cai-ds/tokens@2.0.0-beta.1/dist/cai-tokens.css')
  .then(r => r.status === 200 ? console.log('✓ TOKENS OK') : console.log('✗ Error: ' + r.status))

fetch('https://cdn.jsdelivr.net/npm/@cai-ds/core@2.0.0/dist/cai.css')
  .then(r => r.status === 200 ? console.log('✓ CORE CSS OK') : console.log('✗ Error: ' + r.status))

fetch('https://cdn.jsdelivr.net/npm/@cai-ds/core@2.0.0/dist/cai.js')
  .then(r => r.status === 200 ? console.log('✓ CORE JS OK') : console.log('✗ Error: ' + r.status))
```

---

## 🔍 Paso 6: Verificar Integridad

### 6.1 Verificar en npmjs.com

Visita en el navegador:
- https://www.npmjs.com/package/@cai-ds/tokens
- https://www.npmjs.com/package/@cai-ds/core
- https://www.npmjs.com/package/@cai-ds/platform

Verifica que:
- ✓ Los READMEs se muestren correctamente
- ✓ Las versiones sean correctas
- ✓ Los archivos estén listados
- ✓ El license sea MIT

### 6.2 Instalar desde npm (prueba de consumidor)

En un directorio temporal:

```powershell
mkdir test-cai-ds
cd test-cai-ds
npm init -y
npm install @cai-ds/tokens@2.0.0-beta.1 @cai-ds/core@2.0.0 @cai-ds/platform@2.0.0
```

Verifica que se descarguen sin errores.

### 6.3 Crear HTML de prueba

```powershell
notepad index.html
```

Pegua este contenido:

```html
<!DOCTYPE html>
<html lang="es" data-theme="minimalist">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CAI Design System - CDN Test</title>
    
    <!-- Cargar desde CDN -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@cai-ds/tokens@2.0.0-beta.1/dist/cai-tokens.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@cai-ds/core@2.0.0/dist/cai.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@cai-ds/platform@2.0.0/dist/platform.css">
</head>
<body class="cai-platform-page">
    <div class="cai-platform-content">
        <h1>✓ CDN está funcionando</h1>
        <p>Si ves este texto con estilos, las URLs del CDN funcionan correctamente.</p>
        <button class="cai-btn cai-btn--primary">Botón CAI</button>
    </div>
    
    <script type="module" src="https://cdn.jsdelivr.net/npm/@cai-ds/core@2.0.0/dist/cai.js"></script>
</body>
</html>
```

Abre `index.html` en el navegador. Si ves estilos, ¡las URLs están activas!

---

## ❌ Solución de Problemas

### Problema: "404 - Package not found"

**Causas posibles:**
- [ ] Organización `cai-ds` no existe
- [ ] No eres miembro de la org
- [ ] Nombre de paquete incorrecto
- [ ] Versión no publicada aún

**Solución:**
```powershell
# Verificar org
npm org ls cai-ds

# Verificar paquete existe
npm view @cai-ds/tokens

# Re-publicar si es necesario
cd packages/tokens
npm publish --tag beta --access public --force
```

---

### Problema: "You must be logged in to publish"

**Solución:**
```powershell
npm logout
npm login
npm whoami
```

---

### Problema: "No permission to publish scoped package"

**Causas:**
- [ ] Organización no existe
- [ ] Usuario no es miembro de la org

**Solución:**
```powershell
# Crear org si no existe
# https://www.npmjs.com/org/create

# Agregar usuario a org
# https://www.npmjs.com/org/cai-ds/members
```

---

### Problema: "CDN devuelve 404 después de publicar"

**Solución:**
- jsDelivr puede tardar **hasta 10 minutos** en indexar
- Espera y reintentar
- Limpia caché del navegador (Ctrl+Shift+Delete)
- Prueba en modo incógnito

```powershell
# Ver estado de indexación
curl "https://data.jsdelivr.com/v1/package/npm/@cai-ds/tokens"
```

---

## 📝 Checklist Final

Antes de dar por completada la publicación:

- [ ] Organización `cai-ds` creada en npm
- [ ] Usuario autenticado (`npm whoami` funciona)
- [ ] `pnpm build` completó sin errores
- [ ] `npm pack --dry-run` válido en los 3 paquetes
- [ ] @cai-ds/tokens@2.0.0-beta.1 publicado
- [ ] @cai-ds/core@2.0.0 publicado
- [ ] @cai-ds/platform@2.0.0 publicado
- [ ] CDN retorna HTTP 200 para las 6 URLs
- [ ] npm view muestra los paquetes correctamente
- [ ] npmjs.com muestra los paquetes en la web
- [ ] Instalación npm funciona en proyecto de prueba
- [ ] HTML de prueba carga estilos desde CDN

---

## 🎉 ¡Éxito!

Una vez completados todos los pasos:

1. **Las URLs del proyecto estarán activas**
2. **Otros desarrolladores pueden instalar desde npm**
3. **CDN sirve los archivos globalmente**
4. **Documentación de instalación es correcta**

---

## 📚 Referencias Útiles

- npm docs: https://docs.npmjs.com/
- Publicar paquetes: https://docs.npmjs.com/creating-and-publishing-unscoped-public-packages
- Organizaciones: https://docs.npmjs.com/creating-and-managing-organizations
- jsDelivr: https://www.jsdelivr.com/
- Verificar paquetes: https://npmjs.com/

---

**Contacto de soporte:**
- npm Support: https://support.npmjs.com/
- GitHub Issues: https://github.com/nandovejer/cai/issues
