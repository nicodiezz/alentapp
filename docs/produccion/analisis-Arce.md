# Fase 1: Analizar y proponer

**Usuario:** Arce Franco  
**Fecha:** 03/06/2026  
**Actividad:** TP Integrador - Actividad 4: Preparando para Producción

---

## 1.1. Análisis de la infraestructura Docker actual

### Problema 1: Ausencia de multi-stage build — imagen innecesariamente pesada

| Campo | Descripción |
|-------|-------------|
| **Problema** | Las imágenes de API y Web usan un build en una sola etapa. Se instalan todas las dependencias (incluyendo devDependencies como TypeScript, tsx, etc.) y la imagen final conserva herramientas de compilación que no se necesitan en producción (`npm`, `tsc`, `npx`). |
| **¿Dónde ocurre?** | `packages/api/Dockerfile:1` y `packages/web/Dockerfile:1` — single-stage build con `node:20-alpine`. |
| **Impacto** | **Alto** ya que la imagen final contiene decenas de MBs innecesarios (node_modules con devDeps, binarios de build). Tamaño estimado de alrededor de 1GB para API y 570MB para Web. |
| **Solución propuesta** | Implementar multi-stage build con 3 etapas: `deps` (solo prod deps), `build` (compilación) y `runtime` (solo lo mínimo). Para la Web, usar `nginx:stable-alpine` como runtime. |

### Problema 2: Contenedor ejecutándose como root

| Campo | Descripción |
|-------|-------------|
| **Problema** | Ninguno de los Dockerfiles define un usuario no-root. El contenedor se ejecuta con el usuario `root` por defecto. Si un atacante compromete el contenedor, obtiene acceso root en el mismo. |
| **¿Dónde ocurre?** | `packages/api/Dockerfile` (no hay directiva `USER`) y `packages/web/Dockerfile` (no hay directiva `USER`). |
| **Impacto** | **Alto**. Ejecutar como root es muy inseguro porque si un atacante explota la aplicación, obtiene control total del contenedor y puede modificar archivos, instalar software malicioso o escalar a otros recursos del sistema. |
| **Solución propuesta** | Agregar `USER node` antes del `CMD` en ambos Dockerfiles. La imagen `node:20-alpine` ya incluye el usuario `node`, por lo que solo hace falta agregar esa línea. En los futuros multi-stage builds se debe mantener el mismo approach: cambiar al usuario `node` en la etapa de runtime. |

### Problema 3: Variables sensibles hardcodeadas en docker-compose.yml

| Campo | Descripción |
|-------|-------------|
| **Problema** | Las credenciales de la base de datos (`POSTGRES_USER`, `POSTGRES_PASSWORD`, `DATABASE_URL`) están escritas directamente en `docker-compose.yml`. Esto expone secretos en el repositorio y dificulta rotar credenciales. |
| **¿Dónde ocurre?** | `docker-compose.yml:6-7` (`POSTGRES_USER: admin`, `POSTGRES_PASSWORD: password123`) y `docker-compose.yml:30` (`DATABASE_URL=postgres://admin:password123@db:5432/alentapp_db`). |
| **Impacto** | **Alto** porque cualquier persona con acceso al repositorio conoce las credenciales de la base de datos en todos los entornos. |
| **Solución propuesta** | Usar un archivo `.env` (incluido en `.gitignore`) y referenciar las variables con `${VAR}` en `docker-compose.yml`. Ejemplo: `POSTGRES_PASSWORD: ${DB_PASSWORD}`. |

### Problema 4: Sin healthchecks ni límites de recursos

| Campo | Descripción |
|-------|-------------|
| **Problema** | Los servicios `api` y `web` no tienen `HEALTHCHECK` en sus Dockerfiles ni límites de CPU/memoria definidos en `docker-compose.yml`. En producción, esto impide que Docker detecte y reinicie servicios caídos, y un servicio con fuga de memoria puede acaparar todos los recursos del host. |
| **¿Dónde ocurre?** | `docker-compose.yml:19-41` (servicio api, sin `deploy.resources` ni healthcheck), `docker-compose.yml:43-60` (servicio web, sin `deploy.resources` ni healthcheck). |
| **Impacto** | **Medio**. Sin healthchecks, un servicio que falla silenciosamente no se reinicia automáticamente. Sin límites de recursos, un contenedor puede saturar el host. |
| **Solución propuesta** | Agregar `HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget --no-verbose --tries=1 --spider <http://localhost:3000/health> || exit 1` en el Dockerfile de API (y equivalente en Web). Definir `deploy.resources.limits.cpus: '0.5'` y `deploy.resources.limits.memory: 256M` en `docker-compose.yml`. |

### Problema 5: Volúmenes bind-mount y comandos de desarrollo en docker-compose.yml

| Campo | Descripción |
|-------|-------------|
| **Problema** | `docker-compose.yml` monta todo el directorio del proyecto como bind mount (`. :/app`) y los comandos usan `tsx watch` (API) y `npm run dev` (Web), que son herramientas y modos exclusivos de desarrollo. En producción, los bind mounts exponen el código fuente y los watchers consumen recursos innecesarios. |
| **¿Dónde ocurre?** | `docker-compose.yml:24-28` (volúmenes api: `.:/app`), `docker-compose.yml:35-38` (comando dev API), `docker-compose.yml:51-55` (volúmenes web: `.:/app`), `docker-compose.yml:58` (comando dev Web). |
| **Impacto** | **Medio**. En producción no se debe montar el código fuente (seguridad), y usar watchers/dev-servers degrada performance y estabilidad. |
| **Solución propuesta** | Crear `docker-compose.prod.yml` separado que use las imágenes construidas (no build con bind mount), sin volúmenes de código, y con comandos de producción (`node dist/app.js` para API, nginx para Web). |

---

## 1.2. Investigación sobre OpenTelemetry

### ¿Qué es OpenTelemetry y cómo se diferencia de Prometheus?

**OpenTelemetry** es un conjunto de herramientas que se integran en la aplicación para _generar_ datos sobre su funcionamiento, como métricas (cuántos requests llegan), trazas (por dónde pasa cada solicitud) y logs (mensajes del sistema). Por otro lado, **Prometheus** es un sistema que _recolecta y almacena_ esos datos para poder consultarlos después. La diferencia principal es que OpenTelemetry se encarga de la generación de los datos desde adentro de la app, mientras que Prometheus se encarga de guardarlos y permitir hacer consultas sobre ellos. Ambos se complementan ya que OpenTelemetry produce y Prometheus almacena.

### ¿Cuáles son los "3 pilares" de la observabilidad? ¿Cuál aborda OpenTelemetry?

Los 3 pilares son:

- **Métricas**: valores numéricos que se miden en el tiempo, como cantidad de requests por segundo o uso de memoria.
- **Trazas (traces)**: registros del recorrido completo que hace una solicitud a través de los distintos servicios y componentes de la aplicación.
- **Logs**: mensajes de texto con timestamp que registran eventos específicos, como errores o advertencias.

OpenTelemetry aborda los tres pilares, ya que permite generar y exportar métricas, trazas y logs desde una misma herramienta.

### Métricas RED (Rate, Errors, Duration)

El método RED define las 3 métricas fundamentales para monitorear una API: Rate, Errors y Duration.

El **Rate** es la cantidad de requests por segundo. Permite identificar si la aplicación está recibiendo menos tráfico del esperado (posible caída del servicio) o un pico repentino que podría saturarla. Sirve para dimensionar la capacidad del sistema y detectar anomalías en el volumen de requests.

**Errors** es la cantidad de errores HTTP (códigos 4xx y 5xx). Sirve para detectar problemas en la aplicación. Si la tasa de errores aumenta, puede deberse a un bug en el código, una mala configuración o una dependencia caída. Permite reaccionar rápidamente ante fallos y hacer seguimiento de la estabilidad del sistema.

**Duration** es el tiempo que tarda cada request en completarse. permite medir la experiencia real del usuario. Si un endpoint tarda mucho, los usuarios lo perciben como un sistema lento. Sirve para encontrar cuellos de botella, monitorear degradaciones de performance y establecer alertas cuando la latencia supera un umbral aceptable.

Cada métrica se puede segmentar por método (GET, POST), ruta (/api/socios) y código de respuesta (200, 500) para identificar con precisión dónde ocurren los problemas.

### ¿Qué es el OTLP? ¿Qué ventaja tiene frente a exportar directamente a Prometheus?

**OTLP (OpenTelemetry Protocol)** es el formato de comunicación que usa OpenTelemetry para enviar los datos que genera. La principal ventaja es que, al usar OTLP, la aplicación queda desacoplada de la herramienta de almacenamiento: se puede empezar usando Prometheus y después migrar a Datadog, New Relic o Grafana Cloud sin tocar el código de la aplicación. En cambio, si se exporta directamente a Prometheus, la aplicación queda atada a esa herramienta y cualquier cambio futuro requiere modificar el código.

### ¿Cómo se relaciona OpenTelemetry con Grafana?

Grafana es una herramienta que permite visualizar datos en forma de gráficos y dashboards. OpenTelemetry es quien genera los datos de observabilidad desde la aplicación (métricas, trazas y logs). La relación se da porque Grafana puede tomar los datos que OpenTelemetry produce (a través de algún intermediario como Prometheus u otros conectores) y mostrarlos en paneles visuales. OpenTelemetry se encarga de la generación de datos y Grafana de la visualización, cumplen cada uno un rol distinto pero son complementarios.
