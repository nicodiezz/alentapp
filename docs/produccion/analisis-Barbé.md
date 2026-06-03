# 1.1 Analizar la infraestructura Docker actual

| Problema | ¿Dónde ocurre? | Impacto | Solución propuesta |
| --- | --- | --- | --- |
| La API y el frontend no usan construcción multistage: instalan todas las dependencias, incluyendo las de desarrollo y conservan Node.js en la imagen final | `packages/api/Dockerfile` y `packages/web/Dockerfile` | Medio | Usar `multi-stage builds`. Para la API, copiar únicamente dist/ y las dependencias productivas a la imagen final. Para el frontend, copiar únicamente dist/ y servir los archivos estáticos con Nginx en lugar de Node.js |
| Ningún servicio define límites de CPU ni memoria | `docker-compose.yml`: servicios `api`, `web` y `db` | Medio | Agregar un bloque `deploy.resources.limits` a cada servicio con valores apropiados para evitar que un contenedor consuma todos los recursos del host |
| Los contenedores de API y frontend ejecutan sus procesos como `root` debido a que no se define un usuario no privilegiado | `packages/api/Dockerfile` y `packages/web/Dockerfile`: ausencia de instrucción `USER` | Alto | Ejecutar los procesos con un usuario no-root en las imágenes finales |
| Las credenciales de PostgreSQL están hardcodeadas y se repiten dentro de `DATABASE_URL` | `docker-compose.yml` :líneas 6, 7, 8 y 30 | Alto | Externalizar los valores sensibles a un archivo `.env` excluido del repositorio y referenciar las variables dentro del `docker-compose` con la sintaxis `${VARIABLE}`|
| La API y el frontend no definen `healthchecks` | `docker-compose.yml`: servicios `api` y `web` | Medio | Agregar un healthcheck para la API contra un endpoint como `http://localhost:3000/health` y otro para el frontend contra `http://localhost:80/` |

# 1.2 Investigar OpenTelemetry

## ¿Qué es OpenTelemetry y cómo se diferencia de Prometheus?
OpenTelemetry es un framework de observabilidad, un conjunto de herramientas diseñado para crear y gestionar datos de telemetría como pueden ser trazas, métricas y logs.
La observabilidad es la capacidad para comprender el estado interno de un sistema a través del análisis de sus resultados.

La principal diferencia es que OpenTelemetry proporciona herramientas para generar, recolectar y exportar datos de telemetría, mientras que Prometheus está orientado a recolectar, almacenar y consultar métricas. Ambas herramientas pueden complementarse: OpenTelemetry genera y exporta las métricas de la aplicación, mientras que Prometheus las recolecta y almacena para su posterior consulta.

## ¿Cuáles son los "3 pilares" de la observabilidad? ¿Cuál aborda OpenTelemetry?
Los `3 pilares` de la observabilidad son:
- Trazas
- Métricas
- Logs

Una `traza` nos da una visión general de lo que sucede cuando se hace una solicitud a una aplicación. Las trazas son esenciales para entender la “ruta” completa que una solicitud toma en una aplicación.

Una `métrica` es una medida de un servicio tomada en tiempo de ejecución. El momento de capturar una medida se conoce como evento de métrica, que consiste no solo en la medida en sí misma, sino también en el momento en que fue capturada y los metadatos asociados.

Un `log` es un registro con marca de tiempo emitido por servicios u otros componentes que documentan eventos específicos o mensajes. A diferencia de las trazas, no están necesariamente asociados con una solicitud o transacción de usuario en particular.

OpenTelemetry aborda las tres señales ya que permite unificar métricas, logs y trazas en un solo estándar.

## Expliquen el concepto de métricas RED (rate, errors, duration). ¿Para qué sirve cada una?
Las métricas RED permiten analizar el comportamiento de cada servicio de una aplicación a partir de tres aspectos:
- Rate (cantidad de solicitudes recibidas por segundo)
- Errors (cantidad o porcentaje de solicitudes que fallan)
- Duration (tiempo que tarda el servicio en responder a las solicitudes)

La tasa de solicitudes permite conocer el nivel de tráfico y detectar aumentos o disminuciones inesperadas en el uso del servicio. Una tasa de error elevada se transmite a los usuarios en forma de errores de carga o funcionalidades que no se completan correctamente. Una duración elevada, significa que la aplicación responde con lentitud. 

Estas métricas se miden para cada servicio que procesa solicitudes, lo que proporciona una visión clara y coherente de su comportamiento y facilita la detección de problemas.

## ¿Qué es el OTLP (OpenTelemetry Protocol)? ¿Qué ventaja tiene frente a exportar directamente a Prometheus?
OTLP es un protocolo de entrega de datos de telemetría de uso general diseñado en el marco del proyecto OpenTelemetry. Define la codificación, el transporte y el mecanismo de entrega de datos de telemetría (trazas, métricas y logs) entre fuentes de telemetría, nodos intermedios y backends de observabilidad.

Su principal ventaja frente a exportar directamente a Prometheus es que permite desacoplar la aplicación de una herramienta específica, la aplicación envía los datos a un `Collector` y este se encarga de reenviarlos a Prometheus o a otro destino deseado.

## ¿Cómo se relaciona OpenTelemetry con Grafana?
OpenTelemetry proporciona herramientas para generar, recolectar y exportar datos de telemetría.
Grafana permite analizar y visualizar esos datos mediante gráficos y dashboards. 
Ambas herramientas se complementan ya que OpenTelemetry se encarga de obtener y enviar la información sobre el comportamiento de la aplicación, mientras que Grafana ayuda a interpretarla visualmente.