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
| Stage 1 | `deps` | `node:22-alpine` | Instalar y optimizar únicamente las dependencias de producción (`npm ci --omit=dev ...`) |
| Stage 2 | `build` | `node:22-alpine` | Instalar devDependencies (`npm ci`), compilar TypeScript, generar Prisma Client |
| Stage 3 | `runtime` | `node:22-alpine` | Solo runtime: JS compilado + node_modules prod de Stage 1 (sin npm/npx) |

##### Detalle de cada etapa

**Stage 1 — `deps`**

Instala únicamente las dependencias de producción de la API y poda las herramientas innecesarias (como CLI de Prisma, TypeScript, etc.) para optimizar el almacenamiento en caché y reducir el tamaño final.

```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/api/package.json ./packages/api/
COPY packages/shared/package.json ./packages/shared/
RUN npm ci --omit=dev --omit=peer --workspace=@alentapp/api --include-workspace-root=false && \
    npm cache clean --force && \
    rm -rf \
        node_modules/.bin \
        node_modules/@prisma/client \
        node_modules/@prisma/config \
        node_modules/@prisma/dev \
        node_modules/@prisma/engines \
        node_modules/@prisma/fetch-engine \
        node_modules/@prisma/get-platform \
        node_modules/@prisma/query-plan-executor \
        node_modules/@prisma/studio-core \
        node_modules/@radix-ui \
        node_modules/chart.js \
        node_modules/mysql2 \
        node_modules/postgres \
        node_modules/prisma \
        node_modules/react \
        node_modules/react-dom \
        node_modules/typescript
```

Se instalan únicamente las dependencias productivas para que la etapa runtime final las copie directamente, evitando volver a correr `npm ci` en etapas posteriores y previniendo la invalidación del caché de Docker cuando cambie el código fuente.

**Stage 2 — `build`**

Instala todas las dependencias (incluyendo devDependencies), genera el cliente de Prisma y compila el código TypeScript a JavaScript en el directorio `dist/`.

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/api/package.json ./packages/api/
COPY packages/shared/package.json ./packages/shared/
RUN npm ci
COPY . .
RUN npx prisma generate --config packages/api/prisma.config.ts
RUN npx tsc -p tsconfig.build.json
```

Se instala el set completo de dependencias en esta etapa aislada para poder compilar y generar el cliente de Prisma. El output resultante se guarda en la carpeta `dist/`.

El cliente Prisma se genera en `packages/api/src/generated/client/` (TypeScript). Luego `tsc` compila todo — código fuente + cliente generado — a JavaScript en `dist/`.

**Stage 3 — `runtime`**

Imagen final mínima. Copia el JS compilado (`dist/`) desde la etapa `build` y el directorio `node_modules` optimizado desde la etapa `deps`. No contiene herramientas de build, testing, código fuente, ni herramientas de package management como `npm` o `npx`, mejorando la seguridad.

```dockerfile
FROM node:22-alpine AS runtime
WORKDIR /app

# Copiar estructura de workspaces
COPY package.json package-lock.json ./
COPY packages/api/package.json ./packages/api/
COPY packages/shared/package.json ./packages/shared/

# Copiar node_modules ya filtrados desde la etapa deps
COPY --from=deps /app/node_modules ./node_modules

# Copiar JS compilado (incluye Prisma Client generado)
COPY --from=build /app/dist ./dist

# Eliminar npm/npx para mayor seguridad
RUN rm -rf \
        /usr/local/bin/npm \
        /usr/local/bin/npx \
        /usr/local/lib/node_modules/npm

# Seguridad: usuario no-root
RUN addgroup --system --gid 1001 appgroup && \
    adduser --system --uid 1001 --ingroup appgroup appuser
USER appuser

EXPOSE 3000
EXPOSE 9464

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/health || exit 1

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

Se configura un healthcheck que verifica periódicamente si la API está respondiendo. Se realiza un `GET` a `/health` (`localhost:3000/health`) cada 30 segundos, con un timeout de 5 segundos y 3 reintentos antes de marcar el contenedor como `unhealthy`. Se incluye un período de gracia de 10 segundos al inicio para darle tiempo a Fastify a levantarse. Se usa `wget` en lugar de `curl` porque Alpine lo incluye por defecto.

##### Exclusión de herramientas de build y runtime hardening

La imagen runtime **no contiene** herramientas de build ni gestores de paquetes que solo fueron necesarios en las etapas anteriores:

- `tsc` / `typescript` — compilador, solo necesario en la etapa `build`
- `npx` / `prisma` CLI — generador de cliente, solo necesario en `build`
- `tsx` — transpilador de desarrollo
- `vitest` — framework de testing
- `npm` / `npx` — gestores de paquetes (removidos de la etapa runtime final para reducir la superficie de ataque)

Nota: Las dependencias productivas se instalan y podan en el Stage 1 (`deps`) y se copian directamente al final (`runtime`), por lo que no es necesario contar con `npm` o ejecutar instalaciones en el contenedor final.

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
| **Tamaño de imagen reducido** | Multi-stage build descarta etapas de build. Alpine como base. Solo dependencias de producción en la imagen final |
| **Tiempo de startup bajo** | JavaScript compilado con `tsc`. Node ejecuta `.js` nativamente sin overhead de transpilación |
| **Seguridad** | Usuario `appuser` no-root. Sin herramientas de build en imagen final. Secrets vía env vars |
| **Reproducibilidad** | `npm ci` con lockfile (determinista). Multi-stage build idempotente |
| **Mantenibilidad** | Etapas con nombres semánticos (`deps`, `build`, `runtime`). `.dockerignore` completo |
| **Compatibilidad hexagonal** | La imagen contiene el código compilado de todas las capas de arquitectura hexagonal sin acoplar a ningún adaptador específico |

---

#### Archivos complementarios necesarios

Para que el Dockerfile funcione, se requieren los siguientes archivos adicionales:

**`tsconfig.build.json`** (en la raíz del monorepo): Configuración de TypeScript específica para producción que extiende `tsconfig.json`. Define `outDir: "dist"`, `rootDir: "."`, excluye archivos de test (`*.test.ts`), y desactiva `declaration` y `sourceMap`.

**Script de build en `packages/api/package.json`**: `"build": "tsc -p ../../tsconfig.build.json"` para compilar desde el contexto del paquete.

---


---

### b) Diseño de `packages/web/Dockerfile.prod`

#### Propósito

`packages/web/Dockerfile.prod` es el Dockerfile que genera la imagen de producción del frontend de Alentapp. Su objetivo es producir una imagen mínima y optimizada que sirva los assets estáticos compilados por Vite a través de Nginx, con compresión gzip, caché de assets y security headers.

**Por qué es necesario:** El Dockerfile actual (`packages/web/Dockerfile`) es un build de una sola etapa orientado a desarrollo. Incluye Node.js, todas las devDependencies (Vite, TypeScript, React), y ejecuta el servidor de desarrollo de Vite en lugar de servir assets estáticos compilados. Esto genera una imagen de 570MB con herramientas innecesarias. En producción, el Dockerfile resuelve estos problemas mediante multi-stage builds, eliminando completamente Node.js en la imagen final y Nginx como servidor de archivos estáticos.

**Contexto de ejecución:** El Dockerfile se ejecuta desde la raíz del monorepo (`alentapp/`), ya que el frontend depende del paquete `@alentapp/shared` y la configuración de TypeScript está en la raíz:

```bash
docker build -f packages/web/Dockerfile.prod -t alentapp-web:prod .
```

El `context: .` es necesario porque el monorepo contiene:

- `packages/web/` — código fuente React, configuración de Vite
- `packages/shared/` — DTOs y tipos compartidos (dependencia del frontend)
- `tsconfig.json` raíz — configuración del compilador TypeScript
- `package.json` raíz — definición de workspaces de npm

---

#### Estructura: Multi-stage build con 3 etapas

El Dockerfile se compone de **3 etapas secuenciales**, cada una con una responsabilidad única. Las etapas anteriores proveen insumos a las siguientes, y solo la última genera la imagen final.

##### Tabla de etapas

| Etapa | Nombre | Base | Propósito |
|-------|--------|------|-----------|
| Stage 1 | `deps` | `node:22-alpine` | Instalar dependencias del workspace |
| Stage 2 | `build` | `node:22-alpine` | Compilar el frontend con Vite (`vite build`) |
| Stage 3 | `runtime` | `nginx:stable-alpine` | Servir archivos estáticos compilados con Nginx |

##### Detalle de cada etapa

**Stage 1 — `deps`**

Instala todas las dependencias del monorepo. Se copian primero los `package.json` de cada workspace y el `package-lock.json` para aprovechar el cache de capas de Docker: si los archivos de dependencias no cambian, la capa de `npm ci` se reutiliza en builds posteriores, exactamente igual que el stage `deps` de la api.

```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/web/package.json ./packages/web/
COPY packages/shared/package.json ./packages/shared/
RUN npm ci
```

Se instalan **todas** las dependencias (incluyendo devDependencies) porque la etapa `build` necesita herramientas como `vite` y `typescript` para compilar.

**Stage 2 — `build`**

Compila el código fuente React a assets estáticos. Copia el `node_modules` completo del Stage 1 y el código fuente, ejecuta `vite build`, y produce el directorio `dist/` con HTML, CSS y JavaScript optimizados y minificados.

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build -w packages/web
```

Vite genera el directorio `packages/web/dist/` con todos los assets estáticos listos para ser servidos. Los assets incluyen hashes en sus nombres de archivo (Ej: index-Bx3kL9aP.js), lo que permite configurar caché extensa (Ej: 1 año) en Nginx, ya que si el contenido de un archivo cambia, Vite genera un hash diferente en su nombre, forzando al navegador a descargarlo nuevamente en lugar de usar su copia guardada.

**Stage 3 — `runtime`**

Imagen final mínima basada en Nginx. Toma el directorio dist/ generado por Vite en el Stage 2 y lo copia al directorio donde Nginx busca los archivos para servir (/usr/share/nginx/html). No contiene Node.js, herramientas de build ni código fuente — a diferencia del Stage 3 del backend, no requiere instalar dependencias de producción. Se define explícitamente USER nginx para garantizar ejecución como usuario no-root, requiriendo NET_BIND_SERVICE en el compose para poder bindear el puerto 80.

```dockerfile
FROM nginx:stable-alpine AS runtime

# Copiar assets compilados al directorio donde Nginx busca los archivos para servir
COPY --from=build /app/packages/web/dist /usr/share/nginx/html

# Reemplazar la configuración por defecto de Nginx con la nuestra (gzip, caché, etc)
COPY packages/web/nginx.conf /etc/nginx/conf.d/default.conf

USER nginx

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
```

---

#### Capas y ordenamiento para cache

El orden de las capas en cada etapa está diseñado para maximizar la reutilización del cache de Docker:

1. **Primero** se copian `package.json` y `package-lock.json` (cambian raramente)
2. **Luego** se ejecuta `npm ci` (se cachea si los lockfiles no cambiaron)
3. **Al final** se copia el código fuente (cambia frecuentemente)

Esto significa que en builds consecutivos donde solo cambia código fuente (no dependencias), Docker reutiliza la capa de `npm ci` y solo recompila con Vite. El ahorro es de ~20-40 segundos por build.

---

#### Seguridad

##### Nginx como servidor de producción

A diferencia de la imagen de desarrollo que ejecuta el servidor de Vite (un servidor de desarrollo no apto para producción), la imagen runtime utiliza **Nginx** como servidor HTTP. Esto garantiza:

- Manejo eficiente de conexiones concurrentes (Nginx está diseñado específicamente para atender miles de usuarios simultáneos en producción)
- Security headers HTTP configurables a nivel de servidor (resticciones de seguridad de Nginx para el uso de archivos enviados al browser)
- Compresión gzip nativa sin dependencias adicionales (para que el archivo JS pese menos y viaje mas rápido por el servidor desde Nginx hacia browser)
- Caché de assets estáticos controlada por cabeceras HTTP desde Nginx(cache de archivos del browser)

##### Configuración de Nginx (`nginx.conf`)

```nginx
server {
    listen 80;  # Escucha en el puerto 80
    root /usr/share/nginx/html;	# Indica donde están los archivos que servirá (donde Docker copio /dist)
    index index.html;	 # Al ingresar a la raíz del sitio, Nginx sirve index.html 

    # Compresión gzip
    gzip on;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;  # Indica que tipo de archivos comprimirá
    gzip_min_length 1024;  # Solo comprime archivos mayores a 1 KB.

    # Caché agresiva (1 año) para assets con hash (JS, CSS, imágenes)
    location ~* \.(js|css|png|jpg|jpeg|svg|ico|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";  # Estos archivos jamás cambiaran con el mismo nombre, si se modifican entonces Vite modificara el hash
	
    }

    # Security headers
    add_header X-Frame-Options "DENY";
    add_header X-Content-Type-Options "nosniff";
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    # SPA fallback: redirigir rutas de React Router a index.html
    location / {
      try_files $uri $uri/ /index.html;  
    }
}
```

##### Healthcheck

Se configura un healthcheck que verifica periódicamente si Nginx está respondiendo en el puerto 80. Se realiza un `GET` a la ruta raíz (`localhost:80/`) cada 30 segundos, con un timeout de 5 segundos y 3 reintentos antes de marcar el contenedor como `unhealthy`. Se incluye un período de gracia de 10 segundos al inicio para darle tiempo a Nginx a levantarse. Se usa `wget` en lugar de `curl` porque Alpine lo incluye por defecto.

##### Exclusión de herramientas de build

La imagen runtime **no contiene**:

- `node` / `npm` — no se ejecuta JavaScript en runtime, solo Nginx sirve archivos estáticos
- `vite` — bundler, solo necesario en la etapa `build`
- `tsc` / `typescript` — compilador, solo necesario en `build`
- Código fuente React (`.tsx`, `.ts`) — solo existe el output compilado en `dist/`

Esto se logra porque las etapas `deps` y `build` se descartan: solo se copia el directorio `dist/` a la etapa `runtime`.

##### .dockerignore

El mismo `.dockerignore` definido para la API aplica al contexto de build del frontend, excluyendo `node_modules`, `dist`, `.git`, `.env` y archivos de log. Esto evita copiar archivos innecesarios al contexto de build y reduce el tiempo de transferencia.

---

#### Requisitos no funcionales

| Requisito | Cómo se cumple |
|-----------|---------------|
| **Tamaño de imagen reducido** | Multi-stage build descarta Node.js y herramientas de build. Nginx Alpine como base. Solo assets estáticos en la imagen final |
| **Tiempo de startup bajo** | Nginx inicia en milisegundos, no hay proceso Node.js que arrancar ni módulos que cargar |
| **Seguridad** | Security headers HTTP configurados en Nginx. Sin Node.js ni herramientas de build en la imagen final. Ejecución como usuario no-root (USER nginx) con NET_BIND_SERVICE en el compose para bindear el puerto 80 |
| **Compatibilidad con SPA** | Nginx redirige las rutas del frontend a index.html para que React Router pueda manejar la navegación correctamente |
| **Performance** | Compresión gzip para reducir tamaño de transferencia. Caché inmutable de 1 año para assets con hash de Vite |
| **Reproducibilidad** | `npm ci` con lockfile garantiza instalaciones determinísticas y reproducibles entre entornos |
| **Mantenibilidad** | Etapas con nombres semánticos (`deps`, `build`, `runtime`). Configuración de Nginx en archivo separado |

---

#### Archivos complementarios necesarios

Para que el Dockerfile funcione, se requiere el siguiente archivo adicional:

**`packages/web/nginx.conf`**: Configuración de Nginx específica para el frontend de Alentapp. Define la compresión gzip, la política de caché de assets y los security headers HTTP. Este archivo es copiado en la etapa `runtime` y reemplaza la configuración por defecto de Nginx.


---

### c) Diseño de `docker-compose.prod.yml`

#### Propósito

El archivo `docker-compose.prod.yml` orquesta los servicios de producción de Alentapp (API, frontend y base de datos) en un único stack Docker Compose.

**Por qué es necesario:** El archivo `docker-compose.yml` existente está orientado a desarrollo: no define límites de recursos, no aplica medidas de seguridad (ejecución como root, red default de Docker), no configura rotación de logs y expone variables sensibles. El compose de producción resuelve estos problemas incorporando resource limits, hardening de seguridad, red interna aislada, logging con rotación y secrets externos.

**Contexto de ejecución:** El archivo se ejecuta desde la raíz del monorepo con:

```bash
docker compose -f docker-compose.prod.yml up -d
```

Se requerirá un archivo `.env` en la raíz del monorepo con las credenciales de base de datos. Las imágenes de API y frontend se construyen desde sus respectivos `Dockerfile.prod`:

```bash
docker build -f packages/api/Dockerfile.prod -t alentapp-api:prod .
docker build -f packages/web/Dockerfile.prod -t alentapp-web:prod .
```

---

#### Estructura

El compose define **3 servicios** con dependencias ordenadas: `db` arranca primero, `api` espera a que `db` esté healthy, y `web` espera a que `api` esté healthy.

##### Tabla de servicios

| Servicio | Imagen | Puerto expuesto | Propósito |
|----------|--------|-----------------|-----------|
| `db` | `postgres:16-alpine` | — (solo red interna) | Persistencia de datos PostgreSQL |
| `otel-collector` | `otel/opentelemetry-collector-contrib:latest` | 9464 (Prometheus), 8888 (telemetría interna) | Recolección y exportación de métricas OpenTelemetry |
| `api` | `packages/api/Dockerfile.prod` | 3000 | Endpoints REST de la aplicación |
| `web` | `packages/web/Dockerfile.prod` | 80 | Frontend compilado servido con Nginx |

#### Detalle de cada servicio:
**Servicio `db`**

Responsable de la persistencia de datos de la aplicación.

Características principales:

* Imagen base `postgres:16-alpine`.
* Volumen persistente (`pgdata`) para almacenar los datos entre reinicios y actualizaciones.
* Variables de configuración (`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`) obtenidas desde `.env`.
* Healthcheck con `pg_isready` para bloquear el inicio de la API hasta que la base de datos esté lista.
* Conectado únicamente a la red interna `app-network`, sin exposición al host.

**Servicio `api`**

Responsable de exponer los endpoints REST de la aplicación.

Características principales:

* Imagen construida desde `packages/api/Dockerfile.prod`.
* Exposición del puerto 3000.
* Dependencia de `db` mediante `condition: service_healthy` para evitar arrancar antes de que la base de datos acepte conexiones.
* Variables sensibles (`DATABASE_URL`, etc.) obtenidas desde `.env`.
* Healthcheck HTTP contra `GET /health`.
* Ejecución con usuario no privilegiado (`appuser`, UID 1001), definido en el Dockerfile.
* Sistema de archivos configurado como solo lectura (`read_only: true`).

**Servicio `web`**

Responsable de servir el frontend compilado mediante Nginx.

Características principales:

* Imagen construida desde `packages/web/Dockerfile.prod`.
* Exposición del puerto 80.
* Dependencia de `api` mediante `condition: service_healthy`.
* Healthcheck HTTP contra `localhost:80`.
* Configuración de compresión gzip y caché de assets estáticos gestionada por Nginx.
* Sistema de archivos configurado como solo lectura.

---

#### Resource Limits

Cada servicio tiene límites explícitos de CPU y memoria para evitar el consumo excesivo de recursos del host y mejorar la estabilidad del sistema ante picos de carga.

| Servicio | CPU | Memoria |
|----------|-----|---------|
| `api` | 0.5 CPU | 512 MB |
| `web` | 0.25 CPU | 128 MB |
| `db` | 1 CPU | 1 GB |

Los valores fueron estimados considerando que Alentapp es una aplicación web monolítica compuesta por una API Fastify, un frontend React servido por Nginx y una base de datos PostgreSQL. No incorpora componentes de alto consumo como microservicios, sistemas de mensajería o tareas de cómputo intensivo. Los límites propuestos se consideran suficientes y serán validados durante la fase de implementación.

---

#### Healthchecks

Se configuran verificaciones automáticas para detectar fallos y asegurar que los servicios estén operativos antes de aceptar tráfico o de que los servicios dependientes arranquen.

**API:**

```yaml
healthcheck:
  test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/health"]
  interval: 30s
  timeout: 5s
  retries: 3
  start_period: 10s
```

| Parámetro | Valor | Justificación |
|-----------|-------|---------------|
| `interval` | 30s | Balance entre detectar fallos rápidamente y el rendimiento |
| `timeout` | 5s | Si la API no responde en 5 segundos, se considera caída |
| `start_period` | 10s | Fastify necesita tiempo de arranque; los fallos durante este período no cuentan |
| `retries` | 3 | Tolerancia a fallos transitorios |

**WEB:**

```yaml
healthcheck:
  test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:80/"]
  interval: 30s
  timeout: 5s
  retries: 3
  start_period: 5s
```

| Parámetro      | Valor | Justificación                                                   |
| -------------- | ----- | --------------------------------------------------------------- |
| `interval` | 30s | Balance entre detección de fallos y consumo de recursos |
| `timeout` | 5s | Si Nginx no responde en 5 segundos, se considera una falla |
| `start_period` | 5s | Nginx inicia rápidamente; un período corto es suficiente |
| `retries` | 3 | Evita marcar el servicio como unhealthy por fallos transitorios |


**DB:**

```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U $$POSTGRES_USER -d $$POSTGRES_DB"]
  interval: 10s
  timeout: 5s
  retries: 5
  start_period: 5s
```

| Parámetro | Valor | Justificación |
|-----------|-------|---------------|
| `interval` | 10s | PostgreSQL tarda menos en estar listo; se verifica más frecuentemente |
| `timeout` | 5s | `pg_isready` es casi instantáneo; 5s es margen suficiente |
| `retries` | 5 | PostgreSQL puede tardar en inicializar el directorio de datos en el primer arranque |

---

#### Seguridad

Se aplican las siguientes medidas de endurecimiento en los servicios `api` y `web`:

**api**:
```yaml
  security_opt:
    - no-new-privileges:true
  read_only: true
  cap_drop:
    - ALL
```
**web**:
```yaml
  security_opt:
    - no-new-privileges:true
  read_only: true
  cap_drop:
    - ALL
  cap_add:
    - NET_BIND_SERVICE
```

| Medida | Justificación |
|--------|---------------|
| `read_only: true` | Impide que un proceso comprometido modifique el sistema de archivos del contenedor |
| `cap_drop: ALL` | Elimina todas las Linux capabilities del kernel; el proceso no puede montar filesystems, cambiar IDs de usuario, hacer ping ICMP, etc. |
| `cap_add: NET_BIND_SERVICE` | Se agrega únicamente cuando el servicio necesita bindear puertos < 1024 (Nginx en el puerto 80) |
| `no-new-privileges: true` | Impide que el proceso o sus hijos adquieran privilegios adicionales vía `setuid`/`setgid` |
| Usuario no-root | `api` corre con `appuser` (UID 1001), definido en el Dockerfile; si un atacante compromete la aplicación, solo obtiene acceso de usuario normal |

---

#### Logging

Todos los servicios utilizan el driver `json-file` con rotación automática:

```yaml
logging:
  driver: json-file
  options:
    max-size: "10m"
    max-file: "3"
```

Esta configuración retiene hasta 30MB de logs por servicio y evita el crecimiento ilimitado de archivos en disco, reduciendo el riesgo de que el host se quede sin espacio en producción.

---

#### Red

Se define una red bridge personalizada (`app-network`) para aislar los servicios de otras redes Docker presentes en el host:

```yaml
networks:
  app-network:
    driver: bridge
```

Todos los servicios se comunican exclusivamente a través de esta red interna. El servicio `db` no expone ningún puerto al host; solo es accesible desde `api` dentro de `app-network`.

---

#### Secrets

Las credenciales y variables sensibles no están hardcodeadas en el repositorio. Se utiliza un archivo `.env` (excluido del control de versiones vía `.gitignore`) para almacenar:

- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`
- `DATABASE_URL`

Los servicios obtienen estos valores mediante la directiva `env_file: .env`. Esto facilita la rotación de credenciales entre entornos sin modificar el código fuente.

---

#### Requisitos no funcionales

| Requisito | Objetivo |
|-----------|----------|
| Disponibilidad | Healthchecks activos para API y DB; `web` y `api` no arrancan hasta que sus dependencias estén healthy |
| Seguridad | Usuario no-root, filesystem de solo lectura y capabilities mínimas en todos los servicios |
| Configuración | Variables sensibles externas al repositorio |
| Aislamiento | Debe usar una red bridge personalizada; `db` no debe exponer puertos al host |
| Logging | Rotación automática de logs |
| Consumo de recursos | Límites de CPU y memoria definidos por servicio para proteger el host |
| Persistencia | Los datos de la base de datos deben persistir ante reinicios o recreación de contenedores. |
| Mantenibilidad | Separación completa entre entorno de desarrollo (`docker-compose.yml`) y producción (`docker-compose.prod.yml`) |

---

## 2.2. Diseño de la observabilidad

### a) Métricas RED a capturar

| Métrica | Tipo OpenTelemetry | Descripción | Labels |
| --- | --- | --- | --- |
|Rate | Histogram (`http.server.request.duration`) | Requests por segundo (count del histograma) | http.request.method, http.route, http.response.status_code |
|Errors | Histogram (`http.server.request.duration`) | Tasa de error (4xx/5xx), filtrada por status | http.request.method, http.route, http.response.status_code |
|Duration | Histogram (`http.server.request.duration`) | Latencia de las requests | http.request.method, http.route |


#### Métricas adicionales

| Métrica | Tipo OpenTelemetry | Descripción | Labels |
| --- | --- | --- | --- |
|`process.memory.usage` | ObservableGauge | Memoria del proceso | service.name |
|`http.requests.active`| UpDownCounter | Requests concurrentes | route |

--- 

#### Diseño de implementación

##### 1. Rate, Errors y Duration (RED) — auto-instrumentación

Las tres métricas RED las captura `@opentelemetry/auto-instrumentations-node`, que instrumenta HTTP/Fastify y emite el histograma `http.server.request.duration` según *semantic conventions*, con los atributos `http.request.method`, `http.route` y `http.response.status_code`. No requiere código manual.

A partir de ese histograma se derivan:
-  **Rate:** requests por segundo (a partir del `count` del histograma)
-  **Errors:** filtrando por `http.response.status_code` >= 400 (4xx/5xx)
-  **Duration:** percentiles de latencia (p50/p95/p99)


##### 2. Para la métrica adicional `process.memory.usage` se utilizará un `ObservableGauge` llamado: 
`process.memory.usage`

Se registrará el consumo de memoria utilizado por el proceso mediante un callback que lee:
```js
process.memoryUsage().heapUsed
```
**Su objetivo es calcular:** 
-  Consumo de RAM
-  Estabilidad del servicio


##### 3. Para la métrica adicional `http.requests.active` se utilizará un `UpDownCounter` llamado: 
`http.requests.active`

Se incrementa al iniciar una request (`onRequest`) y se decrementa cuando finaliza (`onResponse`).
```js
activeRequests.add(1)   // onRequest
activeRequests.add(-1)  // onResponse
```
**Su objetivo es detectar:** 
-  Saturación
-  Momentos de mayor concurrencia
-  Sobrecarga de la API

---

### b) OpenTelemetry SDK

#### Instrumentación

| Métrica  | Origen | Mecanismo |
|-------------------|--------|-----------|
| Rate / Errors / Duration (RED) | **Auto-instrumentación** | `@opentelemetry/auto-instrumentations-node` instrumenta HTTP y Fastify, emitiendo las métricas de servidor según *semantic conventions* (`http.server.request.duration`, contadores de request y de status code), con atributos `http.request.method`, `http.route` y `http.response.status_code` |
| `process.memory.usage` | **Manual** | `ObservableGauge` con callback que lee `process.memoryUsage().heapUsed` |
| `http.requests.active` | **Manual** | `UpDownCounter` (`+1` en `onRequest`, `-1` en `onResponse`) |

---

#### Componentes

| Componente | Clase / Paquete | Responsabilidad |
|------------|-----------------|-----------------|
| Resource | `Resource` (`@opentelemetry/resources`) | Atributos que identifican el servicio: `service.name`, `service.version`, `deployment.environment` |
| Exporter | `OTLPMetricExporter` (`@opentelemetry/exporter-metrics-otlp-grpc`) | Envía métricas vía OTLP/gRPC al Collector |
| Metric Reader | `PeriodicExportingMetricReader` (`@opentelemetry/sdk-metrics`) | Recolecta y empuja métricas cada `exportIntervalMillis` |
| Instrumentations | `getNodeAutoInstrumentations()` (`@opentelemetry/auto-instrumentations-node`) | Auto-instrumenta HTTP y Fastify (métricas RED) |
| SDK | `NodeSDK` (`@opentelemetry/sdk-node`) | Orquesta resource + reader + instrumentations y arranca el pipeline |
| Meter | `metrics.getMeter()` (`@opentelemetry/api`) | Provee los instrumentos manuales adicionales |

---

#### Configuración del SDK

El SDK se define en un módulo dedicado (`packages/api/src/telemetry/sdk.ts`) que debe **inicializarse antes que la aplicación Fastify**, para que la auto-instrumentación pueda interceptar los módulos HTTP/Fastify al cargarse.

```ts
import { NodeSDK } from '@opentelemetry/sdk-node'
import { Resource } from '@opentelemetry/resources'
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions'
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics'
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'

// Configuración a implementar:
// 1. OTLPMetricExporter en el puerto 9464 
// 2. Auto-instrumentaciones para HTTP y Fastify
// 3. Métricas manuales: process.memory.usage con ObservableGauge y http.requests.active con UpDownCounter
```


#### Apagado controlado (graceful shutdown)

Para no perder el último lote de métricas, el SDK se cierra ordenadamente ante señales de terminación del contenedor:

```ts
process.on('SIGTERM', () => {
  sdk.shutdown().finally(() => process.exit(0))
})
```

---

#### Variables de entorno

| Variable | Propósito | Ejemplo |
|----------|-----------|---------|
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Endpoint OTLP/gRPC del Collector | `http://otel-collector:4317` |
| `OTEL_SERVICE_NAME` | Nombre del servicio (alternativa al Resource) | `alentapp-api` |
| `APP_VERSION` | Versión reportada en el Resource | `1.0.0` |
| `NODE_ENV` | Entorno de despliegue | `production` |

---

### c) Dashboard RED en Grafana


| Panel | Métrica | Tipo de gráfico | Propósito |
|-------|---------|-----------------|-----------|
| 1. Request Rate | `http.server.request.duration` (count) | Time series (líneas) | Mostrar las requests por segundo a lo largo del tiempo |
| 2. Error Rate | `http.server.request.duration` filtrado por `http.response.status_code` | Time series (líneas) | Mostrar el porcentaje/cantidad de respuestas 4xx y 5xx |
| 3. Latencia (p50/p95/p99) | `http.server.request.duration` (percentiles) | Time series (líneas) | Mostrar cuánto tardan las requests en distintos percentiles |
| 4. Requests activas | `http.requests.active` | Gauge (aguja) | Mostrar cuántas requests se están procesando en este instante |
| 5. Memoria del proceso | `process.memory.usage` | Time series (líneas) | Mostrar el consumo de RAM del proceso de la API |
| 6. Top endpoints | `http.server.request.duration` por `http.route` | Table / Bar gauge | Ranking de las rutas más usadas (y más lentas) |


