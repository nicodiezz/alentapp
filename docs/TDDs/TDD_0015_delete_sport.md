---
id: 0015
estado: Propuesto
autor: Franco Arce
fecha: 2026-05-01
titulo: Eliminación de Deportes Existentes
---
# TDD-0015: Eliminación de Deportes Existentes

## Contexto de Negocio (PRD)

### Objetivo

Permitir eliminar deportes que ya no se ofrecen o que se cargaron por error, manteniendo la lista de actividades limpia y actualizada.

### User Persona

- Nombre: Silvia (Coordinadora de Actividades).
- Necesidad: Quitar rápidamente deportes obsoletos o duplicados del sistema, asegurándose de que ya no aparezcan para nuevas inscripciones.

### Criterios de Aceptación

- El sistema debe validar que el deporte exista antes de eliminarlo.
- El sistema debe realizar un borrado físico del registro.
- En caso de éxito, debe devolver `204 No Content`.
- El deporte eliminado no debe aparecer en las búsquedas ni listados posteriores.

## Diseño Técnico (RFC)

### Contrato de API (@alentapp/shared)

- Endpoint: `DELETE /api/v1/sports/:id`
- Request Body: `None`
- Response: `204 No Content` en caso de éxito

### Componentes de Arquitectura Hexagonal

1. **Puerto**: `SportRepository` con método `delete(id)`.
2. **Caso de Uso**: `DeleteSportUseCase` que verifica la existencia previa vía `findById` y delega la eliminación.
3. **Adaptador de Salida**: `PostgresSportRepository` implementando la eliminación física con el método `delete` de Prisma.
4. **Adaptador de Entrada**: `SportController` con endpoint `DELETE /api/v1/sports/:id`.

## Casos de Borde y Errores

| Escenario               | Resultado Esperado                             | Código HTTP              |
| ----------------------- | ---------------------------------------------- | ------------------------- |
| Deporte inexistente     | Mensaje: "El deporte no existe"                | 404 Not Found             |
| Error de conexión a DB | Mensaje: "Error interno, reintente más tarde" | 500 Internal Server Error |
| Eliminación exitosa    | Respuesta vacía                               | 204 No Content            |

## Plan de Implementación

1. Ampliar el `SportRepository` y `PostgresSportRepository` con el método `delete`.
2. Crear la lógica de negocio en `DeleteSportUseCase`.
3. Crear el endpoint `DELETE /api/v1/sports/:id` en el `SportController` y registrarlo en `app.ts`.
4. Añadir el método `delete` al servicio Frontend (`sport.ts`).
5. Enlazar el botón de eliminación en `SportsView.tsx` agregando la confirmación del navegador (`window.confirm`) antes de hacer la llamada.
