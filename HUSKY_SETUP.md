# Husky Git Hooks Setup

Husky es un framework para usar git hooks fácilmente. El repositorio CAI incluye un pre-commit hook que ejecuta verificación de seguridad automáticamente.

## ¿Qué es un Git Hook?

Un git hook es un script que se ejecuta automáticamente en momentos específicos de git (antes de commit, después de push, etc.).

**Pre-commit hook:** Se ejecuta ANTES de que se cree un commit, permitiendo verificar el código y rechazar commits que no cumplen con ciertos criterios.

## Setup Rápido

### 1. Instalar Husky

```bash
pnpm install husky --save-dev
```

**Nota:** Si ya está instalado, salta al paso 2.

### 2. Inicializar Git Hooks

```bash
pnpm husky install
```

Esto configura el directorio `.git/hooks` para que Husky maneje los hooks.

### 3. Verificar Instalación

```bash
# Debería existir este directorio y archivo
ls -la .husky/
cat .husky/pre-commit

# Debería ser ejecutable
chmod +x .husky/pre-commit
```

### 4. Probar el Hook

```bash
# Hacer un pequeño cambio
echo "test" > test.txt
git add test.txt

# Intentar commit
git commit -m "test commit"

# Debería ver:
# 🔒 Running security checks...
# ✓ Security Verification Passed! (100%)
# ✅ Security checks passed
# [main abc1234] test commit

# Limpiar archivo de test
git reset HEAD test.txt
rm test.txt
```

## ¿Cómo Funciona?

### Flujo Normal (Sin Problemas)

```
$ git commit -m "chore: add feature"
  ↓
.husky/pre-commit ejecuta
  ↓
node scripts/verify-security.js
  ↓
Todas las verificaciones pasan (✓)
  ↓
Commit se crea exitosamente
```

### Flujo Con Error de Seguridad

```
$ git commit -m "chore: accidentally add .env"
  ↓
.husky/pre-commit ejecuta
  ↓
node scripts/verify-security.js
  ↓
Verificación falla (✗ .env not present)
  ↓
Commit se rechaza
  ↓
Mensaje: "❌ Security verification failed. Commit aborted."
  ↓
Debes corregir el problema y reintentar
```

## Verificaciones que se Realizan

El pre-commit hook ejecuta `verify:security` que verifica:

✅ **Secrets no expuestos**
- `.npmrc` no existe en el repo
- `.env` no existe en el repo
- Otros archivos gitignored (`.aws`, `.ssh`)

✅ **Configuración de seguridad**
- `.github/CODEOWNERS` existe
- `.github/dependabot.yml` configurado
- `SECURITY.md` existe
- `.github/workflows/publish.yml` tiene permisos explícitos

✅ **Linting**
- `.eslintrc.json` existe
- `.stylelintrc.json` existe

✅ **Package configuration**
- Node.js version especificado
- pnpm version especificado

Ver [SECURITY_TOOLS.md](./docs/SECURITY_TOOLS.md) para detalles completos.

## Solución de Problemas

### "pre-commit: command not found"

**Causa:** Husky no está instalado o inicializado.

**Solución:**
```bash
pnpm install husky --save-dev
pnpm husky install
chmod +x .husky/pre-commit
```

### "Security Verification Failed"

**Causa:** Uno de los checks de seguridad falló.

**Solución:** Ejecuta manualmente para ver qué falló:
```bash
pnpm verify:security
```

Luego corrige el problema y reintenta el commit.

### Hook ejecutándose pero commit se rechaza

**Esperado:** Algunos errores de seguridad DEBEN rechazar commits.

**Ejemplo válido:**
```
✗ .npmrc is NOT gitignored
```

Significa que `.npmrc` debe estar en `.gitignore`.

### Desactivar temporalmente el hook

⚠️ **NO RECOMENDADO** - Los hooks existen para proteger el repositorio.

Si realmente necesitas saltarte la verificación:
```bash
git commit --no-verify -m "mensaje"
```

Pero esto debería ser muy raro. Si necesitas hacerlo, probablemente hay un problema de seguridad que reportar.

## Próximos Pasos en GitHub

Después de confirmar que Husky funciona localmente:

1. **Push los cambios:**
   ```bash
   git push origin main
   ```

2. **Habilitar branch protection (GitHub UI):**
   - Settings → Branches → Add branch protection rule
   - Requerir status checks: lint, test-unit, build

3. **Habilitar Dependabot (GitHub UI):**
   - Settings → Code security and analysis → Enable Dependabot

4. **Generar nuevo npm token:**
   - npmjs.com → Settings → Tokens
   - Delete viejo token, crear uno nuevo con 30 días de expiration

## Más Información

- [SECURITY_TOOLS.md](./docs/SECURITY_TOOLS.md) — Guía completa de herramientas
- [SECURITY.md](./SECURITY.md) — Política de seguridad
- [SECURITY_ACTIONS.md](./SECURITY_ACTIONS.md) — Pasos manuales en GitHub
- [Husky Docs](https://typicode.github.io/husky/) — Documentación oficial

## Comandos Útiles

```bash
# Ver todos los hooks disponibles
ls -la .husky/

# Ejecutar verificación manual
pnpm verify:security

# Ver qué sucede en el pre-commit hook
cat .husky/pre-commit

# Reinstalar Husky (si algo se rompe)
pnpm install husky --save-dev
pnpm husky install

# Ver el último commit
git log -1 --oneline
```

---

**¿Necesitas ayuda?** Revisa [SECURITY_TOOLS.md](./docs/SECURITY_TOOLS.md) o [CONTRIBUTING.md](./CONTRIBUTING.md).
