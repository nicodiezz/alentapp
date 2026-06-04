# Fase: 1 Analizar y proponer

**Usuario:** Ramiro Gil

**Fecha:** 03/06/2026

**Actividad:** TP Integrador - Actividad 4: Preparando para producción

----

## 1.1. Análisis de la infraestructura Docker actual

## Problema 1: Credenciales de acceso expuestas
| **Problema** | **¿Dónde ocurre?** | **Impacto** | **Solución propuesta** |
| ---    | ---           | ---     | ---                |
| Credenciales de acceso `{POSTGRES_PASSWORD: password123}` y `{DATABASE_URL}` hardcodeadas | `docker-compose.yml:7` y `docker-compose.yml:30` | Alto | Usar Docker Secrets mediante Docker Swarm para manejar las credenciales de forma segura, o alternativamente utilizar variables de entorno desde un archivo `.env` que no se incluya en el repositorio. |

## Problema 2: Falta de healthchecks 

| **Problema** | **¿Dónde ocurre?** | **Impacto** | **Solución propuesta** |
| --- | --- | --- | --- |
| Sin healthchecks, el orquestador no detecta si la aplicación está congelada o aún inicializándose, y el frontend web puede arrancar antes de que la api esté lista para recibir peticiones. | `docker-compose.yml` (servicios `api` y `web`) | Medio | Agregar healthchecks en los puertos 3000 y 5173. Configurar la dependencia del servicio `web` respecto a `api` usando `depends_on` con `condition: service_healthy` |

## Problema 3: Falta de usuario no-root

| **Problema** | **¿Dónde ocurre?** | **Impacto** | **Solución propuesta** |
| --- | --- | --- | --- |
| Los contenedores se ejecutan por defecto como el usuario `root`, lo que expone al host en caso de una vulnerabilidad en la aplicación | `packages/web/Dockerfile:1` y `packages/api/Dockerfile:1` | Alto | Habilitar el usuario no-root `node` preconfigurado en las imágenes oficiales mediante la directiva `USER node`, asegurando la propiedad de los archivos en la etapa de copia (`COPY --chown=node:node`) |

## Problema 4: Falta de limitación de recursos

| **Problema** | **¿Dónde ocurre?** | **Impacto** | **Solución propuesta** |
| --- | --- | --- | --- |
| No hay límites de memoria y procesador para los contenedores. Si un servicio falla o consume de más, puede agotar los recursos de toda la máquina y tirar abajo el resto de la aplicación. | docker-compose.yml:11 (db), `docker-compose.yml:24` y `docker-compose.yml:51` | Alto | Agregar limitación de CPUs y memoria a los contenedores correspondientes a la base de datos, frontend y backend |

## Problema 5: Falta de multistaging 

| Problema | ¿Dónde ocurre? | Impacto | Solución propuesta |
| --- | --- | --- | --- |
| Las imágenes de Docker pesan demasiado porque contienen archivos y herramientas de desarrollo innecesarias para producción, lo que hace que subirlas o descargarlas del servidor sea muy lento. | `packages/web/DockerFile:1` y `packages/api/Dockerfile` | Alto |  Separar la en dos etapas `builder` y `run` en cada DockerFile, de manera que las dependencias se instalen en la etapa `builder` y la etapa `run` solo contenga lo necesario para ejecutar la aplicación, optimizando el tamaño final de la imagen. |

----

## 1.2. Investigar OpenTelemetry

### ¿Qué es OpenTelemetry y cómo se diferencia de Prometheus?

**OpenTelemetry es un framework de observabilidad** y un conjunto de herramientas diseñado para crear y gestionar datos de telemetría como pueden ser: trazas, métricas y logs. Uno de sus objetivos principales es que puedas instrumentar fácilmente tus aplicaciones o sistemas, sin importar el lenguaje de programación, infraestructura o entorno de ejecución.

**Su principal diferencia con Prometheus** radica en que OpenTelemetry no es un sistema de monitorización, sino un conjunto de herramientas para la recopilación de datos de telemetría. Por otro lado, Prometheus sí es un sistema de monitorización que almacena y visualiza métricas, pero no puede recopilar trazas ni logs.

### ¿Cuáles son los "3 pilares" de la observabilidad? ¿Cuál aborda OpenTelemetry?**

Los 3 pilares de la observabilidad son: 

- `Métricas`: es una medida de un servicio capturada en tiempo de ejecución., que consiste no solo en la medida en sí misma, sino también en el momento en que fue capturada y los metadatos asociados. Los datos recopilados se pueden usar para alertar de una interrupción del servicio o para activar decisiones de escalar automáticamente un deployment ante una alta demanda.
- `Logs`: es un registro de texto con marca de tiempo, ya sea estructurado o no estructurado, con metadatos opcionales.
- `Trazas`: nos dan una visión general de lo que ocurre cuando se hace una solicitud a una aplicación, son esenciales para entender la “ruta” completa que una solicitud toma en tu aplicación.

OpenTelemetry aborda los 3 pilares,permitiendo la recolección de los 3 tipos de datos.

### Expliquen el concepto de métricas RED (Rate, Errors, Duration). ¿Para qué sirve cada una?

Las métricas RED (Rate, Errors, Duration) son un marco de observabilidad diseñado para monitorear el rendimiento y la salud de los servicios de TI (como APIs o microservicios).

- **Rate (La tasa de solicitudes por segundo)**: Mide la cantidad de solicitudes o transacciones que recibe un servicio en un período de tiempo determinado. Sirve para conocer el nivel de tráfico o carga que está soportando el sistema.
- **Errors (El número de solicitudes que están fallando)**: Mide cuántas solicitudes terminan con errores, como respuestas HTTP 4xx o 5xx. Sirve para detectar fallas, problemas de disponibilidad o errores en la aplicación.
- **Duration (El tiempo que tardan en responder las solicitudes)**: Mide el tiempo de respuesta de las solicitudes procesadas por el servicio. Sirve para evaluar el rendimiento y detectar problemas de latencia o lentitud en el sistema.

### ¿Qué es el OTLP (OpenTelemetry Protocol)? ¿Qué ventaja tiene frente a exportar directamente a Prometheus?

OTLP (OpenTelemetry Protocol) es el protocolo estándar utilizado por OpenTelemetry para enviar datos de telemetría, como métricas, trazas y logs, desde una aplicación hacia un collector o backend de observabilidad.

Su principal ventaja es que permite enviar métricas, logs y trazas usando un único protocolo estándar, facilitando la integración con distintas herramientas de observabilidad sin modificar el código de la aplicación. En cambio, Prometheus está enfocado principalmente en métricas, por lo que para manejar logs o trazas se necesitan herramientas y configuraciones adicionales.


### ¿Cómo se relaciona OpenTelemetry con Grafana?**

OpenTelemetry se encarga de generar, recolectar y exportar datos de telemetría (métricas, logs y trazas), mientras que Grafana permite visualizarlos y analizarlos mediante dashboards y herramientas de monitoreo.

Por lo general, OpenTelemetry envía los datos a sistemas compatibles como Prometheus o Loki, y Grafana se conecta a esos servicios para mostrar la información de forma gráfica.
