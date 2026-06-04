## Fase 1: Analizar y proponer


**Usuario:** Andrada Santiago   
**Fecha:** 03/06/2026   
**Actividad:** TP Integrador - Actividad 4: Preparando para Producción

---

## 1.1 Analizar la infraestructura Docker actual
 
### Tabla de problemas identificados
 
| # | Problema | ¿Dónde ocurre? | Impacto | Solución propuesta |
|---|----------|----------------|---------|-------------------|
| 1 | Los contenedores corren como usuario `root` por defecto. (dando permisos innecesarios ante una posible vulnerabilidad) | `packages/api/Dockerfile` y `packages/web/Dockerfile` — no se define ningun usuario no privilegiado | **Alto** | Agregar `USER node` antes del CMD en ambos Dockerfiles, las imagenes `node:alpine` ya proveen este usuario no-root y evita ejecutar la aplicacion con privilegios de administrador. |
| 2 | Se utiliza la misma imagen para compilar y ejecutar la aplicación, incluyendo herramientas y dependencias innecesarias en produccion, haciendo a la imagen innecesariamente pesada. | `packages/api/Dockerfile:1` (`FROM node:20-alpine`) y `packages/web/Dockerfile:1` (`FROM node:20-alpine`) | **Alto** | Implementar multi-stage builds (`deps`, `build` y `runtime`) copiando solo los artefactos compilados dependencias de produccion a la imagen final |
| 3 | Credenciales de base de datos hardcodeadas en el Compose | `docker-compose.yml` — `DATABASE_URL=postgres://admin:password123@db:5432/alentapp_db` y credenciales de Postgres (`POSTGRES_USER`, `POSTGRES_PASSWORD`) | **Alto** | Reemplazar valores literales por referencias al `.env` (`${POSTGRES_USER}`, `${DATABASE_URL}`) |
| 4 | No hay limites de recursos (CPU/memoria) definidos para ningún servicio, pudiendo consumir recursos excesivos del host. | `docker-compose.yml` — ningún servicio define `deploy.resources.limits` | **Medio** | Agregar limites de CPU y memoria por servicio mediante deploy.resources.limits |
| 5 | No hay healthchecks para los servicios `api` y `web`, impidiendo la verificacion de docker si api y web funcionan correctamente una vez iniciados | `docker-compose.yml` — solo el servicio `db` tiene `healthcheck` definido; `api` y `web` no tienen ninguno | **Medio** | Agregar healthchecks a `api` y a `web`, para que Docker pueda reportar el estado real de los servicios |

## 1.2. Investigacion sobre OpenTelemetry

### ¿Que es OpenTelemetry y como se diferencia de Prometheus?

**OpenTelemetry** es un estandar abierto que proporciona librerias e instrumentos para que una aplicacion genere y reporte datos de observabilidad (metricas, trazas y logs) sin estar atada a un proveedor especifico. **Prometheus** por otra parte es un sistema especializado en recopilar, almacenar y consultar metricas. OpenTelemetry es el instrumento dentro de la aplicacion que produce los datos y Prometheus es el almacen que los guarda. Entre ellos se complementan: OpenTelemetry genera, Prometheus almacena y Grafana visualiza.

### ¿Cuales son los "3 pilares" de la observabilidad? ¿Cual aborda OpenTelemetry?

Los 3 pilares de la observabilidad son: 
**Metricas** (valores numericos que se registran en el tiempo, como CPU, memoria, requests por segundo), **Trazas** (el recorrido completo de una solicitud a traves de todos los servicios de la aplicacion) y **Logs** (mensajes de texto con timestamp que registran eventos discretos como errores o eventos criticos). OpenTelemetry aborda los 3 pilares, permite instrumentar una aplicacion para capturar metricas, trazas y logs desde un mismo framework, y enviarlos a cualquier backend de almacenamiento.

### Metricas RED: Rate, Errors, Duration

El metodo **RED** define 3 metricas clave para monitorear cualquier servicio:   
**Rate** es la cantidad de solicitudes por segundo; mide el volumen de trafico y detecta anomalias (si cae repentinamente hay un problema, si sube repentinamente podria haber un ataque).   
**Errors** es el porcentaje o cantidad de solicitudes que fallan (codigos 4xx y 5xx); permite identificar que algo no funciona en la aplicacion.    
**Duration** es la latencia promedio de cada solicitud,  refleja la experiencia del usuario y detecta cuellos de botella. Cada metrica puede desglosarse por metodo HTTP (GET, POST), ruta (/api/socios), y codigo de respuesta (200, 500) para diagnosticar con precision donde falla el sistema.

### ¿Que es el OTLP? ¿Que ventaja tiene frente a exportar directamente a Prometheus?

**OTLP (OpenTelemetry Protocol)** es el protocolo estandarizado que usa OpenTelemetry para enviar datos de observabilidad desde la aplicacion hacia un backend collector o almacen. Su ventaja principal es el desacoplamiento: una aplicacion instrumentada con OpenTelemetry puede cambiar de backend (Prometheus, Datadog, New Relic, Grafana Cloud) sin modificar una sola linea de codigo de la aplicacion, solo cambiando la configuracion del exporter. Si exportas directamente a Prometheus, la aplicacion queda acoplada a esa herramienta y cualquier migracion futura requiere reescribir la instrumentacion.

### ¿Como se relaciona OpenTelemetry con Grafana?

OpenTelemetry genera datos de observabilidad desde la aplicacion (metricas, trazas, logs). Grafana es una plataforma de visualizacion que toma esos datos (almacenados en Prometheus, Loki u otros backends) y los muestra en dashboards con graficos y paneles interactivos. La relacion entre ellos es que OpenTelemetry produce, Prometheus u otro backend almacena y Grafana visualiza. Un dashboard de Grafana por ejemplo consulta metricas RED desde Prometheus usando PromQL (metricas tomadas por OpenTelemetry), mostrando en tiempo real el trafico, errores y latencia de la API.