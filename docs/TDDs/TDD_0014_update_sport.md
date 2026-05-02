---
id: 0014
estado: Propuesto
autor: Franco Arce
fecha: 2026-05-01
titulo: Actualización de Deportes Existentes
---
# TDD-0014: Actualización de Deportes Existentes

## Contexto de Negocio (PRD)

### Objetivo

Permitir editar la información de un deporte existente, manteniendo inmutable su nombre, y ajustando solo la descripción y la capacidad máxima.

### User Persona

- Nombre: Silvia (Coordinadora de Actividades).
- Necesidad: Corregir datos operativos de un deporte sin cambiar su estructura principal, como actualizar la descripción o ajustar el cupo disponible.

### Criterios de Aceptación

- El sistema debe permitir modificar únicamente `description` y `max_capacity`.
- El campo `name` no debe poder modificarse después de creado.
- El sistema debe validar que `max_capacity` siga siendo mayor a cero en la actualización.
- Si la edición es correcta, debe retornarse el deporte actualizado.

## Diseño Técnico (RFC)

### Contrato de API (@alentapp/shared)

- Endpoint: `PUT /api/v1/sports/:id`
- Request Body (UpdateSportRequest):

```ts
{
    description?: string;
    max_capacity?: number;
    additional_price?: number;
    requires_medical_certificate?: boolean;
}
```

### Componentes de Arquitectura Hexagonal

1. **Puerto**: `SportRepository` (Método `update(id, data)`).
2. **Servicio de Dominio**: `SportValidator` (Encargado de reutilizar validaciones de capacidad máxima).
3. **Caso de Uso**: `UpdateSportUseCase` (Orquesta la validación y llama al repositorio).
4. **Adaptador de Salida**: `PostgresSportRepository` (Actualización usando el método `update` de Prisma).
5. **Adaptador de Entrada**: `SportController` (Ruta HTTP que extrae el `id` de la URL y mapea excepciones a códigos HTTP).

## Casos de Borde y Errores

| Escenario                             | Resultado Esperado                                    | Código HTTP              |
| ------------------------------------- | ----------------------------------------------------- | ------------------------- |
| Intento de cambiar `name`           | Mensaje: "El nombre del deporte no puede modificarse" | 400 Bad Request           |
| `max_capacity` igual o menor a cero | Mensaje: "La capacidad máxima debe ser mayor a cero" | 400 Bad Request           |
| Deporte inexistente                   | Mensaje: "El deporte no existe"                       | 404 Not Found             |
| Error de conexión a DB               | Mensaje: "Error interno, reintente más tarde"        | 500 Internal Server Error |

## Plan de Implementación

1. Actualizar las interfaces en el paquete `@alentapp/shared` (`UpdateSportRequest`).
2. Ampliar el `SportrRepository` con el método `update`.
3. Implementar la lógica en `UpdateSportUseCase` utilizando el `SportValidator` centralizado.
4. Crear la ruta `PUT` en el controlador y enlazarla a la app de Fastify.
5. Consumir el endpoint desde el servicio de Frontend y reutilizar el modal de creación para permitir la edición.
