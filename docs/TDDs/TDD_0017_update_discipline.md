---
id: 0017
estado: Propuesto
autor: Dante Barbé
fecha: 2026-05-01
titulo: Actualización De Suspensiones Existentes
---

# TDD-0017: Actualización De Suspensiones Existentes

## Contexto de Negocio (PRD)

### Objetivo

Permitir a los administrativos modificar la información de una suspensión existente en el sistema, como su motivo, fecha de inicio, fecha de fin o datos que hayan cambiado o se hayan ingresado incorrectamente.

### User Persona

- Nombre: Juan (Administrativo).
- Necesidad: Modificar datos de las suspensiones rápidamente desde la tabla del panel de administración. Por ejemplo, modificar si la suspensión es total o no.

### Criterios de Aceptación

- El sistema debe permitir actualizar uno, varios o todos los campos de la suspensión.
- El sistema debe validar que, si se cambia alguna de las fechas, la fecha de inicio sea anterior a la fecha de fin.
- El sistema debe validar que, si se cambia el member_id, exista un miembro con ese member_id.
- El sistema debe validar que la suspensión a actualizar exista.
- Si la edición es correcta, debe retornar los nuevos datos de la suspensión actualizados.

## Diseño Técnico (RFC)

### Contrato de API (@alentapp/shared)

Se utilizará el paquete compartido para definir el cuerpo de la petición. Todos los campos son opcionales ya que se trata de una actualización parcial (PATCH a nivel de negocio, aunque el endpoint implemente PUT).

- Endpoint: `PUT /api/v1/disciplines/:id`
- Request Body (UpdateDisciplineRequest):

```ts
{
    reason?: string;
    issue_date?: string;
    expiry_date?: string;
    is_total_suspension?: boolean;
    member_id?: string;
}
```

### Componentes de Arquitectura Hexagonal

1. Puerto: `DisciplineRepository` (Método `update(id, data)`).
2. Servicio de Dominio: `DisciplineValidator` (Encargado de reutilizar validaciones de las fechas).
3. Caso de Uso: `UpdateDisciplineUseCase` (Orquesta la validación y llama al repositorio).
4. Adaptador de Salida: `PostgresDisciplineRepository` (Actualización usando el método `update` de Prisma).
5. Adaptador de Entrada: `DisciplineController` (Ruta HTTP que extrae el `id` de la URL y mapea excepciones a códigos HTTP).

## Casos de Borde y Errores
| Escenario                  | Resultado Esperado                            | Código HTTP actual        |
| -------------------------- | --------------------------------------------- | ------------------------- |
| Suspensión inexistente          | Mensaje: "La suspensión no existe"               | 404 Not Found           |
| `member_id` inexistente         | Mensaje: "El miembro indicado no existe"          | 404 Not Found           |
| `expiry_date` anterior a `issue_date` | Mensaje: "La fecha de fin de suspensión no puede ser previa a la fecha de inicio"| 400 Bad Request           |
| Fecha con formato inválido | Mensaje: "Formato de fecha inválido"| 400 Bad Request        |
| Error de conexión a DB     | Mensaje: "Error interno, reintente más tarde" | 500 Internal Server Error |

## Plan de Implementación

1. Actualizar las interfaces en el paquete `@alentapp/shared` (`UpdateDisciplineRequest`).
2. Ampliar el `DisciplineRepository` con el método `update`.
3. Implementar la lógica en `UpdateDisciplineUseCase` utilizando el `DisciplineValidator` centralizado.
4. Crear la ruta `PUT` en el controlador y enlazarla a la app de Fastify.
5. Consumir el endpoint desde el servicio de Frontend y reutilizar el modal de creación para permitir la edición.