---
id: 0012
estado: Implementado
autor: Ramiro Gil
fecha: 2026-05-01
titulo: Eliminación de Casilleros Existentes
---

# TDD-0006: Eliminación de Casilleros Existentes

## Contexto de Negocio (PRD)

### Objetivo
Permitir a los coordinadores dar de baja permanentemente la información de un casillero existente, eliminando su registro de la base de datos.


### User Persona

- Nombre: Carina (Coordinadora de instalaciones).
- Necesidad: Eliminar casilleros que ya no están en uso para mantener la información actualizada y evitar inconsistencias en el sistema.


### Criterios de Aceptación

- El sistema debe pedir una confirmación explícita (advertencia visual) antes de proceder con el borrado.
- El sistema debe validar que el locker exista antes de intentar borrarlo.
- El sistema debe realizar un borrado físico de la base de datos (hard delete).
- Si el borrado es exitoso, la tabla debe actualizarse automáticamente.

## Diseño Técnico (RFC)

### Contrato de API (@alentapp/shared)

Al tratarse de una operación destructiva que solo requiere conocer el identificador, no se envía cuerpo en la petición HTTP.

- Endpoint: `DELETE /api/v1/lockers/:id`
- Request Body: `None`
- Response: `204 No Content` en caso de éxito.

### Componentes de Arquitectura Hexagonal

1. **Puerto**: `LockerRepository` (Método `delete(id)`).
2. **Caso de Uso**: `DeleteLockerUseCase` (Comprueba existencia previa vía `findById` y delega la eliminación).
3. **Adaptador de Salida**: `PostgresLockerRepository` (Eliminación usando el método `delete` de Prisma).
4. **Adaptador de Entrada**: `LockerController` (Ruta HTTP que extrae el `id` y devuelve un status 204).

## Casos de Borde y Errores

| Escenario                  | Resultado Esperado                            | Código HTTP actual        |
| -------------------------- | --------------------------------------------- | ------------------------- |
| Locker inexistente          | Mensaje: "El Locker no existe"               | 404 Not found          |
| Error de conexión a DB     | Mensaje: error del motor de base de datos     | 400 Bad Request           |
| Eliminación exitosa        | Respuesta vacía                               | 204 No Content            |

## Plan de Implementación

1. Ampliar el `LockerRepository` y `PostgresLockerRepository` con el método `delete`.
2. Crear la lógica de negocio en `DeleteLockerUseCase`.
3. Crear el endpoint `DELETE /api/v1/lockers/:id` en el `LockerController` y registrarlo en `app.ts`.
4. Añadir el método `delete` al servicio Frontend (`lockers.ts`).
5. Enlazar el botón de eliminación en `LockersView.tsx` agregando la confirmación del navegador (`window.confirm`) antes de hacer la llamada.
