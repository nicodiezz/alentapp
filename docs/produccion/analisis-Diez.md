| Problema | ¿Dónde ocurre? | Impacto | Solución propuesta |
|--------------|----------|--------|-----|
|usuario y contraseña y url de DB hardcodeadas | docker-compose.yml:6;7;30 | alto | trasladar variables de entorno a un .env |
|Ningún servicio cuenta con límites de recursos | docker-compose.yml | medio | agregar propiedades mem-limit y cpus a cada servicio | 
| contenedor ejecutado como root | packages/web/Dockerfile | alto | crear usuario no privilegiado y correr el contenedor con el mismo |
| contenedor ejecutado como root | packages/api/Dockerfile | alto | crear usuario no privilegiado y correr el contenedor con el mismo |
|volúmenes de código | docker-compose.yml:25-28;52-55 | medio | crear docker compose de producción que no monte volúmenes de código/node_modules |
| política de reinicio inexistente | docker-compose.yml | medio | agregar propiedad restart a cada servicio |
| peso de imágen muy alto (1.78 GB) | packages/api/Dockerfile | medio | usar build multi-stage para eliminar dependencias innecesarias |
| peso de imágen muy alto (1.01 GB) | packages/web/Dockerfile | medio | usar build multi-stage para eliminar dependencias innecesarias |
| Se usa `npm install` en vez de `npm ci`: builds no reproducibles, puede mutar package-lock.json | packages/api/Dockerfile:12; packages/web/Dockerfile:8 | medio | usar `npm ci` para instalación determinística desde el lockfile |
| Se ejecutan servidores de desarrollo en lugar de builds de producción (`tsx watch`, `npm run dev`) | docker-compose.yml:36-38;58 | alto | compilar para producción |
| Puerto de la base de datos publicado al host | docker-compose.yml:10 | alto | no exponer el puerto en producción, dejar la DB accesible solo por la red interna de Docker |
| Sin HEALTHCHECK | packages/api/Dockerfile; packages/web/Dockerfile; | medio | agregar healthcheck a api y web |
| `web` depende de `api` sin esperar a que esté saludable | docker-compose.yml: 60 | bajo | usar `depends_on: api: condition: service_healthy` junto con un healthcheck en api |


#### ¿Qué es OpenTelemetry y cómo se diferencia de Prometheus?
OpenTelemetry es un estándar para recolectar métricas, logs y trazas independiente de la herramienta que utilizemos para almacenar / monitorear esas métricas. Define un protocólo y un formato. Prometheus, en cambio, es una herramienta que sirve para almacenar y consultar métricas y generar alertas. Se pueden usar en conjunto.
#### ¿Cuáles son los "3 pilares" de la observabilidad? ¿Cuál aborda OpenTelemetry?
Los 3 pilares son:
- métricas: valores que miden la cálidad del software
- logs: registro de eventos en el sistema
- trazas: recorrido de cada petición.
Los tres comparten trace_id.
OpenTelemetry aborda las 3

#### Expliquen el concepto de métricas RED (Rate, Errors, Duration). 
- _R_ ate: Cantidad de requests por unidad de tiempo.
- _E_ rrors: Cantidad o porcentaje de errores
- _D_ uration: Tiempo que tarda una request.

| ¿Para qué sirve cada una?

- R: sirve para analizar el tráfico del sistema y tomar medidas en caso de que este caiga (por fallos o baja demanda) o incremente súbitamente (preparar el producto para próximos picos de demanda).

- E: sirve para medir la confiabilidad del sistema. 

- D: sirve para detectar cuellos de botella o lentitud general del software.
#### ¿Qué es el OTLP (OpenTelemetry Protocol)? ¿Qué ventaja tiene frente a exportar directamente a Prometheus?
OTLP define cómo se transmiten trazas, logs y métricas entre la aplicación y el vendor (backend de observabilidad). Esto nos permite cambiar fácilmente de vendor o utilizar distintos vendors para cada servicio o tipo de dato. Si exportaramos directamente a Prometheus sería muy complejo combinar o cambiar a otros vendors.  
#### ¿Cómo se relaciona OpenTelemetry con Grafana?
Grafana permite visualizar los datos obtenidos con OpenTelemetry en dashboards.
