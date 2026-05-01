---
id: 0018
estado: Propuesto
autor: Dante Barbé
fecha: 2026-05-01
titulo: Eliminación De Suspensiones Existentes
---

# TDD-0018: Eliminación De Suspensiones Existentes

## Contexto de Negocio (PRD)

### Objetivo

Permitir a los administrativos dar de baja permanentemente a una suspensión del sistema, eliminando su registro de la base de datos.

### User Persona

- Nombre: Juan (Administrativo).
- Necesidad: Borrar una suspensión que fue cargada por error o una suspensión de prueba, de forma rápida desde la misma tabla principal. Necesita una advertencia antes de borrar para no cometer equivocaciones irreparables.

### Criterios de Aceptación
- El sistema debe pedir una confirmación explícita (advertencia visual) antes de proceder con el borrado.
- El sistema debe validar que la suspensión exista antes de intentar borrarla.
- El sistema debe realizar un borrado físico de la base de datos (hard delete).
- Si el borrado es exitoso, la tabla debe actualizarse automáticamente.

## Diseño Técnico (RFC)

### Contrato de API (@alentapp/shared)

Al tratarse de una operación destructiva que solo requiere conocer el identificador, no se envía cuerpo en la petición HTTP.

- Endpoint: `DELETE /api/v1/discipline/:id`
- Request Body: `None`
- Response: `204 No Content` en caso de éxito.

### Componentes de Arquitectura Hexagonal

1. Puerto: `DisciplineRepository` (Método `delete(id)`).
2. Caso de Uso: `DeleteDisciplineUseCase` (Comprueba existencia previa vía `findById` y delega la eliminación).
3. Adaptador de Salida: `PostgresDisciplineRepository` (Eliminación usando el método `delete` de Prisma).
4. Adaptador de Entrada: `DisciplineController` (Ruta HTTP que extrae el `id` y devuelve un status 204).

## Casos de Borde y Errores

| Escenario                  | Resultado Esperado                            | Código HTTP actual        |
| -------------------------- | --------------------------------------------- | ------------------------- |
| Suspensión inexistente          | Mensaje: "La suspensión no existe"               | 400 Bad Request           |
| Error de conexión a DB     | Mensaje: error del motor de base de datos     | 400 Bad Request           |
| Eliminación exitosa        | Respuesta vacía                               | 204 No Content            |

## Plan de Implementación

1. Ampliar el `DisciplineRepository` y `PostgresDisciplineRepository` con el método `delete`.
2. Crear la lógica de negocio en `DeleteDisciplineUseCase`.
3. Crear el endpoint `DELETE /api/v1/discipline/:id` en el `DisciplineController` y registrarlo en `app.ts`.
4. Añadir el método `delete` al servicio Frontend (`displines.ts`).
5. Enlazar el botón de eliminación en `DisciplinesView.tsx` agregando la confirmación del navegador (`window.confirm`) antes de hacer la llamada.