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

Se configura un healthcheck que verifica periódicamente si la API está respondiendo. Se realiza un `GET` a la ruta raíz (`localhost:3000/`) cada 30 segundos, con un timeout de 5 segundos y 3 reintentos antes de marcar el contenedor como `unhealthy`. Se incluye un período de gracia de 10 segundos al inicio para darle tiempo a Fastify a levantarse. Se usa `wget` en lugar de `curl` porque Alpine lo incluye por defecto.

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
// 1. OTLPMetricExporter en el puerto específicado en el .env 
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


