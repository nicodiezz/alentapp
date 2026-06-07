# Fase 4: Verificar y entregar

**Grupo:** 4
**Fecha:** 07/06/2026
**Actividad:** TP Integrador - Actividad 4: Preparando para Producción

---

## 4.1. Verificación técnica

| Métrica              | Antes (desarrollo) | Después (producción) | Mejora            |
| --------------------- | ------------------ | ---------------------- | ----------------- |
| Tamaño imagen API    | 1.64GB             | 456MB                  | ~72% reducción   |
| Tamaño imagen Web    |                    |                        |                   |
| Tiempo de startup API | 53.288s            | 13.352s                | ~75% más rápido |
| Memoria API (idle)    |                    |                        |                   |
| Endpoints accesibles  |                    |                        |                   |
| Frontend vía nginx   | —                 |                        |                   |

---

## 4.4. Documentación de decisiones

### Arquitectura final

*(Completar)*

---

### Decisiones técnicas

#### Multi-stage build para la API (`packages/api/Dockerfile.prod`)

**Decisión:** se decidió usar un multi-stage build para la API de `packages/api/Dockerfile.prod`, separando la instalación de dependencias productivas, la generación y compilación del código, y la imagen runtime mínima que ejecuta solo el JavaScript compilado.

**Por qué:** esta implementación reduce el tamaño de la imagen final, mejora la seguridad y acelera el arranque en producción. La primera etapa (`deps`) instala solo dependencias de producción y poda tooling innecesario, lo que evita que devDependencies como TypeScript, Prisma CLI o pruebas terminen en la imagen final. La segunda etapa (`build`) instala devDependencies necesarias para generar el cliente Prisma y compilar TypeScript sobre el código fuente. La etapa final (`runtime`) copia únicamente `node_modules` productivos y el `dist/` compilado, elimina `npm`/`npx`, expone solo los puertos necesarios y ejecuta la aplicación como un usuario no-root.

---

#### Multi-stage build para el frontend (`packages/web/Dockerfile.prod`)

**Decisión:**

**Por qué:**

---

#### Docker Compose de producción (`docker-compose.prod.yml`)

**Decisión:**

**Por qué:**

---

#### OpenTelemetry

**Decisión:**

**Por qué:**

---

#### Métricas RED

**Decisión:**

**Por qué:**

---

### Problemas encontrados

| Problema | Solución |
| -------- | --------- |
|          |           |
|          |           |
|          |           |

---

### Capturas de pantalla

*(Completar con capturas de pantalla de dashboard RED)*
