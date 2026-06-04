# Fase 2: Especificar y diseñar

**Grupo:** 4  
**Fecha:** 04/06/2026  
**Actividad:** TP Integrador - Actividad 4: Preparando para Producción

---

## 2.1. Diseño de la infraestrutura Docker

### a) Diseño de `packages/api/Dockerfile.prod`

#### Propósito

`packages/api/Dockerfile.prod` es el Dockerfile que genera la imagen de producción del backend de Alentapp. Su objetivo es producir una imagen mínima, segura y optimizada que contenga solo lo necesario para ejecutar la API (Fastify + Prisma) en un entorno productivo.

**Por qué es necesario:** El Dockerfile actual (`packages/api/Dockerfile`) es un build de una sola etapa orientado a desarrollo. Incluye todas las devDependencies (TypeScript, tsx, vitest, prisma CLI), ejecuta como root, y no tiene healthcheck. Esto genera una imagen de ~1GB con herramientas innecesarias y vulnerabilidades de seguridad. El Dockerfile de producción resuelve estos problemas mediante multi-stage builds, eliminación de herramientas de build, usuario no-root y healthcheck.

**Contexto de ejecución:** El Dockerfile se ejecuta desde la raíz del monorepo (`alentapp/`), ya que la API depende del paquete `@alentapp/shared` y la configuración de TypeScript está en la raíz:

```bash
docker build -f packages/api/Dockerfile.prod -t alentapp-api:prod .
```

El `context: .` es necesario porque el monorepo contiene:

- `packages/api/` — código fuente, Prisma, controladores
- `packages/shared/` — DTOs y tipos compartidos (dependencia de la API)
- `tsconfig.json` raíz — configuración del compilador TypeScript
- `package.json` raíz — definición de workspaces de npm

---

#### Estructura: Multi-stage build con 3 etapas

El Dockerfile se compone de **3 etapas secuenciales**, cada una con una responsabilidad única. Las etapas anteriores proveen insumos a las siguientes, y solo la última genera la imagen final.

##### Tabla de etapas

| Etapa | Nombre | Base | Propósito |
|-------|--------|------|-----------|
| Stage 1 | `deps` | `node:22-alpine` | Instalar solo dependencias de producción (`npm ci --omit=dev`) |
| Stage 2 | `build` | `node:22-alpine` | Compilar TypeScript, generar Prisma Client |
| Stage 3 | `runtime` | `node:22-alpine` | Solo runtime: JS compilado + node_modules prod + usuario no-root |

##### Detalle de cada etapa

**Stage 1 — `deps`**

Instala todas las dependencias del monorepo. Se copian primero los `package.json` de cada workspace y el `package-lock.json` para aprovechar el cache de capas de Docker: si los archivos de dependencias no cambian, la capa de `npm ci` se reutiliza en builds posteriores.

```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/api/package.json ./packages/api/
COPY packages/shared/package.json ./packages/shared/
RUN npm ci
```

Se instalan **todas** las dependencias (incluyendo devDependencies) porque la etapa `build` necesita herramientas como `prisma` CLI y `typescript` para compilar.

**Stage 2 — `build`**

Compila el código TypeScript a JavaScript y genera el cliente de Prisma. Copia el `node_modules` completo del Stage 1 y el código fuente, ejecuta las herramientas de build, y produce el directorio `dist/` con el JS compilado.

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate --config packages/api/prisma.config.ts
RUN npx tsc -p tsconfig.build.json
```

El cliente Prisma se genera en `packages/api/src/generated/client/` (TypeScript). Luego `tsc` compila todo — código fuente + cliente generado — a JavaScript en `dist/`.

**Stage 3 — `runtime`**

Imagen final mínima. Copia solo el JS compilado (`dist/`), los `package.json` necesarios para que npm resuelva las workspaces, e instala **solo** dependencias de producción. No contiene herramientas de build, testing ni código fuente.

```dockerfile
FROM node:22-alpine AS runtime
WORKDIR /app

# Copiar estructura de workspaces para que npm resuelva los links
COPY package.json package-lock.json ./
COPY packages/api/package.json ./packages/api/
COPY packages/shared/package.json ./packages/shared/

# Copiar JS compilado (incluye Prisma Client generado)
COPY --from=build /app/dist ./dist

# Instalar SOLO dependencias de producción
RUN npm ci --omit=dev

# Seguridad: usuario no-root
RUN addgroup --system --gid 1001 appgroup && \
    adduser --system --uid 1001 --ingroup appgroup appuser
USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

CMD ["node", "dist/packages/api/src/app.js"]
```

---

#### Capas y ordenamiento para cache

El orden de las capas en cada etapa está diseñado para maximizar la reutilización del cache de Docker:

1. **Primero** se copian `package.json` y `package-lock.json` (cambian raramente)
2. **Luego** se ejecuta `npm ci` (se cachea si los lockfiles no cambiaron)
3. **Al final** se copia el código fuente (cambia frecuentemente)

Esto significa que en builds consecutivos donde solo cambia código fuente (no dependencias), Docker reutiliza la capa de `npm ci` y solo recompila. El ahorro es de ~30-60 segundos por build.

---

#### Seguridad

##### Usuario no-root

```dockerfile
RUN addgroup --system --gid 1001 appgroup && \
    adduser --system --uid 1001 --ingroup appgroup appuser
USER appuser
```

La imagen `node:22-alpine` ya trae el usuario `node`, pero se crea un usuario dedicado `appuser` con UID/GID explícitos (1001) para:

- Tener control documental sobre las credenciales del contenedor
- Cumplir el principio de mínimo privilegio
- Si un atacante compromete la aplicación, solo obtiene acceso de usuario normal, no root

##### Healthcheck

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1
```

| Parámetro | Valor | Justificación |
|-----------|-------|---------------|
| `--interval` | 30s | Balance entre detectar fallos rápidamente y no generar overhead excesivo de red |
| `--timeout` | 5s | Si la API no responde en 5 segundos, se considera caída |
| `--start-period` | 10s | Fastify necesita tiempo para bootstrapping; durante este período los fallos no cuentan |
| `--retries` | 3 | Tolerancia a fallos transitorios (pico de CPU, GC, etc.) |

Se utiliza `GET /` (la ruta raíz existente en `app.ts:211`) para no requerir cambios en el código de la aplicación. Se usa `wget` en lugar de `curl` porque Alpine incluye `wget` por defecto pero no `curl`.

##### Exclusión de herramientas de build

La imagen runtime **no contiene**:

- `tsc` / `typescript` — compilador, solo necesario en la etapa `build`
- `npx` / `prisma` CLI — generador de cliente, solo necesario en `build`
- `tsx` — transpilador de desarrollo
- `vitest` — framework de testing
- `npm` — gestor de paquetes (no se hacen installs en runtime)

Esto se logra porque las etapas `deps` y `build` se descartan: solo se copia el resultado compilado (`dist/`) a la etapa `runtime`.

##### .dockerignore

```dockerignore
node_modules
dist
.git
.gitignore
docs
*.md
*.log
.env
.env.*
!.env.example
coverage
test-results
playwright-report*
.DS_Store
```

**Justificación de las exclusiones principales:**

- `node_modules`: Se reinstala con `npm ci` en cada etapa (garantiza reproducibilidad)
- `dist`: Se genera fresco en la etapa `build`
- `.git`: Historial de versiones no necesario en la imagen (~50MB+ ahorrados)
- `.env`: Los secrets se inyectan vía variables de entorno del contenedor, no del filesystem
- `docs` / `*.md`: Documentación no necesaria en runtime

---

#### Requisitos no funcionales

| Requisito | Cómo se cumple |
|-----------|---------------|
| **Tamaño de imagen < 400MB** | Multi-stage build descarta etapas de build. Alpine como base (~50MB). `npm ci --omit=dev` elimina ~70% de dependencias. `.dockerignore` excluye archivos innecesarios |
| **Tiempo de startup < 5 segundos** | JavaScript compilado con `tsc` (sin transpilación on-the-fly). Node ejecuta `.js` nativamente sin overhead de tsx |
| **Seguridad** | Usuario `appuser` no-root. Sin herramientas de build en imagen final. Sin source maps. Secrets vía env vars |
| **Reproducibilidad** | `npm ci` con lockfile (determinista). Multi-stage build idempotente |
| **Mantenibilidad** | Etapas con nombres semánticos (`deps`, `build`, `runtime`). `.dockerignore` completo. Comentarios en el Dockerfile |
| **Compatibilidad hexagonal** | La imagen contiene el código compilado de todas las capas de arquitectura hexagonal (domain, application, delivery, infrastructure) sin acoplar a ningún adaptador específico. Los puertos (interfaces) se mantienen como contratos, los adaptadores de infraestructura (Postgres*) se incluyen como implementaciones intercambiables |

---

#### Archivos complementarios necesarios

Para que el Dockerfile funcione, se requieren los siguientes archivos adicionales:

**`tsconfig.build.json`** (en la raíz del monorepo): Configuración de TypeScript específica para producción que extiende `tsconfig.json`. Define `outDir: "dist"`, `rootDir: "."`, excluye archivos de test (`*.test.ts`), y desactiva `declaration` y `sourceMap`.

**Script de build en `packages/api/package.json`**: `"build": "tsc -p ../../tsconfig.build.json"` para compilar desde el contexto del paquete.
