---
id: 0011
estado: Propuesto
autor: Dante Barbé
fecha: 2026-05-02
titulo: Actualización de Casilleros Existentes
---
# TDD-0011: Actualización de Casilleros Existentes

## Contexto de Negocio (PRD)

### Objetivo

Permitir a los coordinadores corregir o modificar la información de un casillero existente en el sistema, como su locación o status.

### User Persona

- Nombre: Carina (Coordinadora de instalaciones).
- Necesidad: Modificar la información de los casilleros rápidamente. Por ejemplo, actualizar el status de un casillero de Occupied a Available

### Criterios de Aceptación

- El sistema debe permitir actualizar uno, varios o todos los campos del casillero.
- El sistema debe validar que, en caso de modificar el número de casillero, `number` sea un valor númerico y no existente en el sistema.
- El sistema no debe permitir que se asigne un socio si el status del casillero es Maintenance.
- El sistema debe validar que exista un casillero con ese id.
- Si la edición es correcta, debe retornar los nuevos datos del casillero actualizados.

## Diseño Técnico (RFC)

### Contrato de API (@alentapp/shared)

- Endpoint: `PUT /api/v1/lockers/:id`
- Request Body (UpdateLockerRequest):

```ts
{
    number?: number;
    location?: string;
    status?: `Available` | `Occupied` | `Maintenance`;
    member_id?: string;
}
```

### Componentes de Arquitectura Hexagonal

1. Puerto: `LockerRepository` (Método `update(id, data)`).
2. Servicio de Dominio: `LockerValidator` (Encargado de reutilizar validaciones de número de casillero).
3. Caso de Uso: `UpdateLockerUseCase` (Orquesta la validación y llama al repositorio).
4. Adaptador de Salida: `PostgresLockerRepository` (Actualización usando el método `update` de Prisma).
5. Adaptador de Entrada: `LockerController` (Ruta HTTP que extrae el `id` de la URL y mapea excepciones a códigos HTTP).

## Casos de Borde y Errores

| Escenario                                              | Resultado Esperado                                           | Código HTTP              |
| ------------------------------------------------------ | ------------------------------------------------------------ | ------------------------- |
| Casillero inexistente                                  | Mensaje: "El casillero no existe"                            | 404 Not Found             |
| Número de casillero duplicado                         | Mensaje: "Ya existe un casillero con ese número"            | 409 Conflict              |
| Modificar member_id a casillero con status Maintenance | Mensaje: "No se puede asignar un casillero en mantenimiento" | 409 Conflict              |
| Error de conexión a BD                                | Mensaje: "Error interno, reintente más tarde"               | 500 Internal Server Error |

## Plan de Implementación

1. Actualizar las interfaces en el paquete `@alentapp/shared` (`UpdateLockerRequest`).
2. Ampliar el `LockerRepository` con el método `update`.
3. Implementar la lógica en `UpdateLockerUseCase` utilizando el `LockerValidator` centralizado.
4. Crear la ruta `PUT` en el controlador y enlazarla a la app de Fastify.
5. Consumir el endpoint desde el servicio de Frontend y reutilizar el modal de creación para permitir la edición.
