# 📦 Publicación de Paquetes CAI en npm

Este directorio contiene toda la documentación y herramientas necesarias para publicar los paquetes `@cai-ds/*` en npm y hacerlos disponibles a través del CDN jsDelivr.

## 🚀 Inicio Rápido

### Opción A: Automatizado (Recomendado)

Si tienes Node.js ≥ 18, pnpm ≥ 9, y una cuenta npm con la organización `cai-ds`:

```powershell
npm login
.\publish.ps1
```

El script hace todo automáticamente en ~2 minutos.

### Opción B: Manual

1. Lee: `PUBLISH_QUICK_REFERENCE.txt` (5 min)
2. Sigue: `PUBLISH_GUIDE.md` (30 min)
3. Usa: `PUBLISH_CHECKLIST.md` para tracking

## 📋 Archivos en este Directorio

| Archivo | Propósito | Tiempo |
|---------|-----------|--------|
| **PUBLISH_QUICK_REFERENCE.txt** | Referencia rápida con comandos | 5 min |
| **PUBLISH_GUIDE.md** | Guía completa paso a paso | 30-45 min |
| **PUBLISH_CHECKLIST.md** | Checklist interactivo | Mientras avanzas |
| **publish.ps1** | Script automatizado | 1-2 min ejecución |
| **URL_STATUS_REPORT.md** | Estado actual de las 6 URLs | Informativo |
| **PUBLISH_README.md** | Este archivo | - |

## ✅ Pre-requisitos (Una sola vez)

```
☐ Crear organización 'cai-ds' en npm
   → https://www.npmjs.com/org/create

☐ Tener Node.js >= 18.0.0
   → https://nodejs.org/

☐ Tener pnpm >= 9.0.0
   → npm install -g pnpm@9

☐ Cuenta npm verificada
   → https://www.npmjs.com/signup
```

## 🔧 Pasos Principales

### 1. Autenticarse
```powershell
npm login
npm whoami  # Verificar
```

### 2. Ir al Directorio
```powershell
cd c:\Users\mago\Documents\LeadFront\repos-github\cai
```

### 3. Compilar
```powershell
pnpm install
pnpm build
```

### 4. Publicar (EN ESTE ORDEN)

**4.1 Tokens (base)**
```powershell
cd packages/tokens
npm publish --tag beta --access public
cd ../..
```

**4.2 Core (depende de tokens)**
```powershell
cd packages/core
npm publish --access public
cd ../..
```

**4.3 Platform (depende de core)**
```powershell
cd packages/platform
npm publish --access public
cd ../..
```

### 5. Esperar
jsDelivr indexa en **1-10 minutos**

### 6. Verificar
Abre en navegador:
- https://cdn.jsdelivr.net/npm/@cai-ds/tokens@2.0.0-beta.1/dist/cai-tokens.css
- https://cdn.jsdelivr.net/npm/@cai-ds/core@2.0.0/dist/cai.css
- (y las demás URLs en PUBLISH_QUICK_REFERENCE.txt)

Debe devolver **HTTP 200**.

## 📦 Paquetes a Publicar

| Paquete | Versión | Tag | Status |
|---------|---------|-----|--------|
| @cai-ds/tokens | 2.0.0-beta.1 | beta | 404 (sin publicar) |
| @cai-ds/core | 2.0.0 | latest | 404 (sin publicar) |
| @cai-ds/platform | 2.0.0 | latest | 404 (sin publicar) |

## 🌐 URLs que se activarán

Una vez publicados, estas 6 URLs estarán disponibles:

```
✓ https://cdn.jsdelivr.net/npm/@cai-ds/tokens@2.0.0-beta.1/dist/cai-tokens.css
✓ https://cdn.jsdelivr.net/npm/@cai-ds/core@2.0.0/dist/cai.css
✓ https://cdn.jsdelivr.net/npm/@cai-ds/core@2.0.0/dist/cai.js
✓ https://cdn.jsdelivr.net/npm/@cai-ds/platform@2.0.0/dist/platform.css
✓ https://cdn.jsdelivr.net/npm/@cai-ds/core@2.0.0/dist/themes/cai-theme-minimalist.css
✓ https://cdn.jsdelivr.net/npm/@cai-ds/core@2.0.0/dist/themes/cai-theme-ricardoymortimer.css
```

## ❓ ¿Necesitas ayuda?

### Problema: "Package not found"
- Verificar que org `cai-ds` existe
- Verificar que eres miembro: `npm org ls cai-ds`

### Problema: "You must be logged in"
```powershell
npm logout
npm login
npm whoami
```

### Problema: CDN devuelve 404
- Esperar más (hasta 10 minutos para indexación)
- Limpiar caché navegador
- Leer "Solución de Problemas" en PUBLISH_GUIDE.md

### Más ayuda
- Lee: `PUBLISH_GUIDE.md` → Sección "Solución de Problemas"
- npm docs: https://docs.npmjs.com/
- npm support: https://support.npmjs.com/

## 📞 Contacto

- **GitHub**: https://github.com/nandovejer/cai/issues
- **npm Support**: https://support.npmjs.com/
- **jsDelivr**: https://www.jsdelivr.com/

## 📚 Documentación Relacionada

- [PUBLISH_GUIDE.md](./PUBLISH_GUIDE.md) - Guía completa
- [PUBLISH_QUICK_REFERENCE.txt](./PUBLISH_QUICK_REFERENCE.txt) - Referencia rápida
- [PUBLISH_CHECKLIST.md](./PUBLISH_CHECKLIST.md) - Checklist de seguimiento
- [URL_STATUS_REPORT.md](./URL_STATUS_REPORT.md) - Estado actual de URLs

## 🎯 Después de Publicar

Una vez que los paquetes estén en npm:

1. **Actualizar documentación externa** que referencia estas URLs
2. **Comunicar a usuarios** que están disponibles en npm registry
3. **Monitorear issues** en GitHub por problemas de consumidores
4. **Mantener compatible** las URLs del CDN en futuras versiones

## ✨ Éxito

Cuando hayas completado todos los pasos:

✅ Los paquetes están en npm registry  
✅ Las URLs del CDN están activas  
✅ Los usuarios pueden instalar con `npm install @cai-ds/...`  
✅ Los usuarios pueden cargar desde CDN  

---

**Última actualización**: 2026-05-20  
**Estado**: ✅ Documentación completa, paquetes listos para publicar
