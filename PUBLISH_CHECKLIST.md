# ☑️ Checklist de Publicación en npm

**Fecha de inicio**: _________________  
**Fecha de finalización**: _________________

---

## 📋 PRE-REQUISITOS (Una sola vez)

### Cuenta y Organización npm

- [ ] Crear cuenta en npm (https://www.npmjs.com/signup)
- [ ] Verificar email de npm
- [ ] Crear organización `cai-ds` (https://www.npmjs.com/org/create)
- [ ] Confirmar que soy miembro de la organización

### Software requerido

- [ ] Node.js >= 18.0.0 instalado (`node --version`)
- [ ] pnpm >= 9.0.0 instalado (`pnpm --version`)
- [ ] Correo de verificación de npm confirmado

---

## 🔐 PASO 1: Autenticación

- [ ] Ejecutar: `npm login`
- [ ] Ingresar username
- [ ] Ingresar password
- [ ] Ingresar email
- [ ] Ingresar OTP (código 2FA si aplica)
- [ ] Verificar: `npm whoami` (debe mostrar mi usuario)
- [ ] Verificar permisos de org: `npm access list teams org cai-ds`

**Notas:**
```


```

---

## 📂 PASO 2: Preparación Local

- [ ] Navegar al directorio del proyecto
  ```
  cd c:\Users\mago\Documents\LeadFront\repos-github\cai
  ```

- [ ] Verificar rama: `git branch` (debe ser: main)
- [ ] Verificar cambios: `git status` (debe estar limpio)
- [ ] Si hay cambios, commitearlos:
  ```
  git add .
  git commit -m "mensaje"
  ```

- [ ] Actualizar desde remoto: `git pull origin main`

**Notas:**
```


```

---

## 🔨 PASO 3: Compilación y Validación

- [ ] Instalar dependencias: `pnpm install`
- [ ] Compilar proyecto: `pnpm build`
  - [ ] ✓ Sin errores
  - [ ] ✓ `packages/tokens/dist/` generado
  - [ ] ✓ `packages/core/dist/` generado
  - [ ] ✓ `packages/platform/dist/` generado

- [ ] Validar `@cai-ds/tokens`:
  ```
  cd packages/tokens
  npm pack --dry-run
  cd ../..
  ```
  - [ ] ✓ Incluye `dist/cai-tokens.css`
  - [ ] ✓ Incluye `dist/fonts/`
  - [ ] ✓ Tamaño > 100KB

- [ ] Validar `@cai-ds/core`:
  ```
  cd packages/core
  npm pack --dry-run
  cd ../..
  ```
  - [ ] ✓ Incluye `dist/cai.css`
  - [ ] ✓ Incluye `dist/cai.js`
  - [ ] ✓ Incluye `dist/themes/`

- [ ] Validar `@cai-ds/platform`:
  ```
  cd packages/platform
  npm pack --dry-run
  cd ../..
  ```
  - [ ] ✓ Incluye `dist/platform.css`

**Notas:**
```


```

---

## 🚀 PASO 4: Publicación (ORDEN IMPORTANTE)

### 4.1 Publicar @cai-ds/tokens@2.0.0-beta.1

```
cd packages/tokens
npm publish --tag beta --access public
cd ../..
```

- [ ] Publicación iniciada
- [ ] Salida exitosa (check visible)
- [ ] Esperar 1-2 minutos
- [ ] Verificar: `npm view @cai-ds/tokens@2.0.0-beta.1`
  - [ ] ✓ Información visible
  - [ ] ✓ Tag: beta
  - [ ] ✓ Archivos listados

**Salida esperada:**
```
npm notice Publishing to registry with tag beta
npm notice Publishing @cai-ds/tokens@2.0.0-beta.1
+ @cai-ds/tokens@2.0.0-beta.1
```

**Notas:**
```


```

---

### 4.2 Publicar @cai-ds/core@2.0.0

```
cd packages/core
npm publish --access public
cd ../..
```

- [ ] Publicación iniciada
- [ ] Salida exitosa (check visible)
- [ ] Esperar 1-2 minutos
- [ ] Verificar: `npm view @cai-ds/core@2.0.0`
  - [ ] ✓ Información visible
  - [ ] ✓ Tag: latest
  - [ ] ✓ Archivos listados

**Salida esperada:**
```
npm notice Publishing to registry with tag latest
npm notice Publishing @cai-ds/core@2.0.0
+ @cai-ds/core@2.0.0
```

**Notas:**
```


```

---

### 4.3 Publicar @cai-ds/platform@2.0.0

```
cd packages/platform
npm publish --access public
cd ../..
```

- [ ] Publicación iniciada
- [ ] Salida exitosa (check visible)
- [ ] Esperar 1-2 minutos
- [ ] Verificar: `npm view @cai-ds/platform@2.0.0`
  - [ ] ✓ Información visible
  - [ ] ✓ Tag: latest
  - [ ] ✓ Archivos listados

**Salida esperada:**
```
npm notice Publishing to registry with tag latest
npm notice Publishing @cai-ds/platform@2.0.0
+ @cai-ds/platform@2.0.0
```

**Notas:**
```


```

---

## ⏳ PASO 5: Esperar Indexación CDN

- [ ] Esperar 1-10 minutos (jsDelivr necesita indexar)
- [ ] Tiempo de inicio: ________________
- [ ] Tiempo de fin estimado: ________________

**Durante la espera, puedes:**
- [ ] Visitar npmjs.com y verificar paquetes
- [ ] Limpiar caché del navegador
- [ ] Preparar pruebas

---

## ✅ PASO 6: Verificación en CDN

### 6.1 Verificación en Navegador

Abre estas URLs en nuevas pestañas y verifica que cargan (HTTP 200):

- [ ] https://cdn.jsdelivr.net/npm/@cai-ds/tokens@2.0.0-beta.1/dist/cai-tokens.css
- [ ] https://cdn.jsdelivr.net/npm/@cai-ds/core@2.0.0/dist/cai.css
- [ ] https://cdn.jsdelivr.net/npm/@cai-ds/core@2.0.0/dist/cai.js
- [ ] https://cdn.jsdelivr.net/npm/@cai-ds/platform@2.0.0/dist/platform.css
- [ ] https://cdn.jsdelivr.net/npm/@cai-ds/core@2.0.0/dist/themes/cai-theme-minimalist.css
- [ ] https://cdn.jsdelivr.net/npm/@cai-ds/core@2.0.0/dist/themes/cai-theme-ricardoymortimer.css

### 6.2 Verificación en Web npmjs.com

- [ ] https://www.npmjs.com/package/@cai-ds/tokens
  - [ ] ✓ README visible
  - [ ] ✓ Versión 2.0.0-beta.1
  - [ ] ✓ Tag beta
  - [ ] ✓ Archivos listados

- [ ] https://www.npmjs.com/package/@cai-ds/core
  - [ ] ✓ README visible
  - [ ] ✓ Versión 2.0.0
  - [ ] ✓ License MIT
  - [ ] ✓ Depende de tokens

- [ ] https://www.npmjs.com/package/@cai-ds/platform
  - [ ] ✓ README visible
  - [ ] ✓ Versión 2.0.0
  - [ ] ✓ License MIT
  - [ ] ✓ Depende de core

**Notas:**
```


```

---

## 🧪 PASO 7: Prueba de Instalación

### 7.1 Instalar en Proyecto de Prueba

```powershell
mkdir test-cai-ds
cd test-cai-ds
npm init -y
npm install @cai-ds/tokens@2.0.0-beta.1 @cai-ds/core@2.0.0 @cai-ds/platform@2.0.0
```

- [ ] Carpeta `node_modules` creada
- [ ] `@cai-ds/tokens` instalado
- [ ] `@cai-ds/core` instalado
- [ ] `@cai-ds/platform` instalado
- [ ] Sin errores de peer dependencies

### 7.2 Crear HTML de Prueba

```html
<!DOCTYPE html>
<html lang="es" data-theme="minimalist">
<head>
    <meta charset="UTF-8">
    <title>CAI CDN Test</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@cai-ds/tokens@2.0.0-beta.1/dist/cai-tokens.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@cai-ds/core@2.0.0/dist/cai.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@cai-ds/platform@2.0.0/dist/platform.css">
</head>
<body class="cai-platform-page">
    <h1>✓ CDN funcionando!</h1>
    <button class="cai-btn cai-btn--primary">Test Button</button>
    <script type="module" src="https://cdn.jsdelivr.net/npm/@cai-ds/core@2.0.0/dist/cai.js"></script>
</body>
</html>
```

- [ ] Crear archivo `index.html` con contenido anterior
- [ ] Abrir en navegador
- [ ] Verificar:
  - [ ] ✓ Estilos cargados (font, colores, espaciado visible)
  - [ ] ✓ Botón con estilos CAI
  - [ ] ✓ Sin errores en consola
  - [ ] ✓ Responde a clicks (comportamiento JS funciona)

**Notas:**
```


```

---

## 🎉 PASO 8: Finalización

- [ ] Todos los pasos anteriores completados ✓
- [ ] 6 URLs del CDN activas (HTTP 200) ✓
- [ ] npmjs.com muestra los paquetes correctamente ✓
- [ ] Instalación en proyecto de prueba funciona ✓
- [ ] HTML de prueba carga estilos correctamente ✓
- [ ] No hay errores en consola del navegador ✓
- [ ] Script JS de core funciona correctamente ✓

### Documentación Final

- [ ] Actualizar README.md del proyecto (agregar referencia a publicación)
- [ ] Agregar link a PUBLISH_GUIDE.md en la documentación principal
- [ ] Crear issue de GitHub si algún paso falló
- [ ] Notificar al equipo que los paquetes están publicados

**Notas finales:**
```


```

---

## ❌ Solución de Problemas (Si algo falla)

Si en algún paso falla algo:

1. [ ] Revisar la sección correspondiente en PUBLISH_GUIDE.md
2. [ ] Consultar "Solución de Problemas" al final del documento
3. [ ] Verificar que los pre-requisitos están completos
4. [ ] Ejecutar el comando nuevamente
5. [ ] Si persiste, contactar soporte npm

**Problema encontrado:**
```


```

**Solución aplicada:**
```


```

---

## 📝 Registro de Ejecución

**Usuario npm**: _______________________________

**Fecha de inicio**: _______________________________

**Fecha de finalización**: _______________________________

**Duración total**: _______________________________

**Problemas encontrados**: 
```


```

**Soluciones aplicadas**: 
```


```

**Notas generales**: 
```


```

---

## ✨ ¡COMPLETADO!

Cuando hayas marcado todos los items de la sección "PASO 8: Finalización", 
la publicación habrá sido completada exitosamente.

**Los paquetes están ahora disponibles en:**
- npm registry: https://www.npmjs.com/
- CDN jsDelivr: https://www.jsdelivr.com/

**Próximos pasos:**
- Comunicar a usuarios que los paquetes están disponibles
- Actualizar documentación externa
- Monitorear cualquier issue de usuarios

---

**Documento completado el**: _______________________________

**Revisado por**: _______________________________
