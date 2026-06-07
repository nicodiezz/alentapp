# Fase 4: Verificar y entregar

**Grupo:** 4
**Fecha:** 07/06/2026
**Actividad:** TP Integrador - Actividad 4: Preparando para Producción

---

## 4.1. Verificación técnica

| Métrica              | Antes (desarrollo) | Después (producción) | Mejora            |
| --------------------- | ------------------ | ---------------------- | ----------------- |
| Tamaño imagen API    | 1.64GB             | 456MB                  | ~72% reducción   |
| Tamaño imagen Web | 861 MB | 93.7 MB | ~89% reducción|
| Tiempo de startup API | 53.288s            | 13.352s                | ~75% más rápido |
| Memoria API (idle) | 155.3MiB (sin límite) | 43.11MiB / 512MiB (8.42%) | ~72% reducción |
| Endpoints accesibles | curl :3000/api/v1/socios | curl :3000/api/v1/socios | — |
| Frontend vía nginx | — | curl localhost/ | Servido por nginx |

---

## 4.2. Verificación de seguridad

| Verificación | Estado | Evidencia |
| --- | --- | --- |
| La API corre con usuario no-root | ✅ | `Dockerfile.prod` — `adduser appuser (UID 1001)` + `USER appuser` |
| No hay `npm`/`tsc`/`python` en la imagen final | ✅ | `Dockerfile.prod` — `rm -rf /usr/local/bin/npm /usr/local/bin/npx /usr/local/lib/node_modules/npm` |
| Read-only filesystem activo | ✅ | `docker-compose.prod.yml` — `read_only: true` en servicios `api` y `web` |
| Capabilities mínimas (`cap_drop: ALL`) | ✅ | `docker-compose.prod.yml` — `cap_drop: [ALL]`; `web` agrega solo `NET_BIND_SERVICE` para puerto 80 |
| No new privileges | ✅ | `docker-compose.prod.yml` — `no-new-privileges: true` en `api` y `web` |
| Variables sensibles via `.env`, no hardcodeadas | ✅ | `docker-compose.prod.yml` — `env_file: .env`; `.env` está en `.gitignore` |
| Healthchecks en estado `healthy` | ✅ | `docker-compose.prod.yml` — healthcheck configurado en `api`, `web` y `db` con `wget` / `pg_isready` |

---

## 4.3. Verificación de observabilidad

| Verificación | Estado | Evidencia |
| --- | --- | --- |
| OpenTelemetry exporta métricas via OTLP | ✅ | `telemetry.ts` — `OTLPMetricExporter` apunta a `otel-collector:4317` vía gRPC |
| El Collector reexpone métricas en `:9464` para Prometheus | ✅ | `otel-collector-config.yml` — exporter prometheus en `0.0.0.0:9464` |
| Prometheus scrapea el endpoint del Collector | ✅ | `observability/prometheus/prometheus.yml` — job `otel-collector` scrapeando `:9464` cada 15s |
| Grafana tiene datasource Prometheus configurado | ✅ | `observability/grafana/provisioning/datasources/datasource.yml` — datasource apunta a `http://prometheus:9090` |
| El dashboard RED tiene 6 paneles funcionales | ✅ | `observability/grafana/dashboards/red-dashboard.json` — 6 paneles: Request Rate, Error Rate, Latencia p50/p95/p99, Active Requests, Memoria, Top Endpoints |
| Los gráficos responden al tráfico generado | ✅ | Ver captura de pantalla en sección 4.4 |
| Las métricas de error reflejan 4xx/5xx | ✅ | Panel "Error Rate" filtra por `http_response_status_code >= 400` vía auto-instrumentación de OTel |

---

## 4.4. Documentación de decisiones

### Arquitectura final

Open Telemetry instrumenta a la API por dos métodos:
1. por auto instrumentación para las métricas RED
2. por instrumentación manual para las otras 2 métricas
Exporta la telemetría vía OTLP hacia el colector de open telemetry en el puerto 4317.
El collector recibe las métricas y las reexpone a Prometheus en el puerto 9464
Prometheus hace scrap cada 15s al endpoint del collector y almacena las métricas. Luego las expone en el puerto 9090.
Grafana consulta a Prometheus como datasource y muestra los 6 paneles en el puerto 3001

Flujo de extremo a extremo: `API :3000 → (OTLP/gRPC) Collector :4317 → (expone) :9464 → (scrape) Prometheus :9090 → (query) Grafana :3001`.

Se utilizó auto instrumentación para las métricas RED para evitar escribir código ya implementado.
Se utilizó el protocolo OTLP con el collector de Open Telemetry para más tarde poder cambiar más fácilmente de datasource o combinar con otros.

![Diagrama del flujo de observabilidad](/docs/produccion/assets/Group%2033303.png)

---

### Decisiones técnicas

#### Multi-stage build para la API (`packages/api/Dockerfile.prod`)

**Decisión:** se decidió usar un multi-stage build para la API de `packages/api/Dockerfile.prod`, separando la instalación de dependencias productivas, la generación y compilación del código, y la imagen runtime mínima que ejecuta solo el JavaScript compilado.

**Por qué:** esta implementación reduce el tamaño de la imagen final, mejora la seguridad y acelera el arranque en producción. La primera etapa (`deps`) instala solo dependencias de producción y poda tooling innecesario, lo que evita que devDependencies como TypeScript, Prisma CLI o pruebas terminen en la imagen final. La segunda etapa (`build`) instala devDependencies necesarias para generar el cliente Prisma y compilar TypeScript sobre el código fuente. La etapa final (`runtime`) copia únicamente `node_modules` productivos y el `dist/` compilado, elimina `npm`/`npx`, expone solo los puertos necesarios y ejecuta la aplicación como un usuario no-root.

---

#### Multi-stage build para el frontend (`packages/web/Dockerfile.prod`)

**Decisión:** Se implementó un multi-stage build de 3 etapas (`deps`, `build`, `runtime`). La etapa `deps` instala todas las dependencias con `npm ci`, `build` compila el proyecto con Vite generando los assets en `packages/web/dist/`, y `runtime` es una imagen `nginx:stable-alpine` que únicamente contiene Nginx y los archivos estáticos compilados (sin Node.js, sin el código fuente ni las herramientas de build). Se configuró `USER nginx` para ejecutar el proceso como usuario no-root, incorporando al compose el `tmpfs` necesario para los directorios temporales de Nginx y la capability `NET_BIND_SERVICE` para bindear el puerto 80.

**Por qué:** El servidor de desarrollo de Vite no es optimo para producción ya que no maneja conexiones concurrentes de forma eficiente ni ofrece compresión gzip, caché de assets ni security headers de forma nativa. Nginx resuelve todos esos aspectos. Usar `npm ci` en lugar de `npm install` (presente en el Dockerfile de desarrollo) garantiza instalaciones determinísticas usando exactamente las versiones indicadas. La caché agresiva (1 año) es segura porque Vite incluye hashes de contenido en los nombres de los archivos compilados, de forma que cualquier modificacion en el archivo produce un nombre de archivo distinto y el navegador descarga la versión nueva de asi serlo.

---

#### Docker Compose de producción (`docker-compose.prod.yml`)

**Decisión**: se configuró un docker-compose.prod.yml separado del de desarrollo con cinco ajustes principales: límites de recursos (deploy.resources.limits), hardening de seguridad (read_only, cap_drop: ALL, no-new-privileges), healthchecks para API y frontend, rotación de logs (json-file con max-size/max-file) y credenciales externalizadas en env_file en lugar de valores hardcodeados.

**Por qué**: en desarrollo el compose prioriza comodidad (hot-reload, puertos expuestos, credenciales fijas), pero en producción cada servicio debe estar aislado y acotado. Los límites de CPU y memoria evitan que un contenedor consuma todos los recursos del host. El modo read_only con tmpfs solo para los directorios que nginx necesita escribir reduce la superficie de ataque. Los healthchecks permiten que Docker orqueste el arranque en orden correcto y detecte servicios caídos. La rotación de logs evita que los archivos JSON del driver crezcan sin límite en disco.

---

#### OpenTelemetry

| Problema | Solución |
| -------- | --------- |
| La implementación exportaba métricas directamente a Prometheus en lugar de usar el protocolo OTLP con un collector intermedio, lo que no correspondía con el diseño. | Se reemplazó el exporter por `OTLPMetricExporter` apuntando a `otel-collector:4317` y se agregó el servicio `otel-collector` al `docker-compose.prod.yml`, que recibe las métricas por OTLP y las reexpone a Prometheus. |

---

#### Métricas RED

| Problema | Solución |
| -------- | --------- |
| Las métricas RED estaban instrumentadas manualmente en cada controller con contadores propios, cuando el diseño especificaba que debían obtenerse por auto-instrumentación. Además, los nombres y labels que generaban no coincidían con el estándar de OpenTelemetry. | Se eliminó la instrumentación manual de los controllers. Las métricas RED pasan a ser responsabilidad de la auto-instrumentación de OpenTelemetry, que las expone con los nombres y labels estándar. Se conservó la instrumentación manual únicamente para las dos métricas adicionales: `process.memory.usage` y `http.requests.active`. |

---

### Problemas encontrados

| Problema | Solución |
| -------- | --------- |
| Al arrancar el stack de producción, las migraciones de base de datos no se aplicaban porque no existía un servicio dedicado para ejecutarlas | Se decidió no agregar un servicio `migrate` al `docker-compose.prod.yml`. En su lugar, las migraciones se ejecutan automáticamente como parte del script de deploy, antes de levantar los contenedores |
| `read_only: true` combinado con `USER nginx` hace que Nginx falle al intentar crear sus directorios temporales (`/var/cache/nginx/client_temp`, `/var/run`), produciendo el error `mkdir() failed (13: Permission denied)` al arrancar el contenedor. | Se agregaron entradas `tmpfs` en el servicio `web` del `docker-compose.prod.yml` para `/var/cache/nginx` y `/var/run`, lo que permite a Nginx escribir en esos paths en memoria sin romper el filesystem de solo lectura. |
|          |           |

---

### Capturas de pantalla

![Captura de pantalla de Grafana](/docs/produccion/assets/IMG-20260607-WA0022.jpg)
