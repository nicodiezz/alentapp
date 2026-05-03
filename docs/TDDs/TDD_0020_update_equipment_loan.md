---
id: 0020
estado: Propuesto
autor: Nicolás Diez
fecha: 2026-05-02
titulo: Actualización de Préstamos de Equipamientos
---

# TDD-0020: Actualización de Préstamos de Equipamientos

## Contexto de Negocio (PRD)

### Objetivo

Permitir que un usuario administrador pueda modificar la información de un préstamo de equipamiento ya existente, como la fecha de devolución esperada, el socio que recibió el préstamo o el estado del préstamo para corregir errores o actualizar los datos.

### User Persona

- Nombre: Alberto (Tesorero/Administrativo).
- Necesidad: Poder corregir errores en los préstamos registrados (por ejemplo, extender la fecha de devolución) o registrar que un equipo fue devuelto en mal estado.

### Criterios de Aceptación

- El sistema debe permitir actualizar uno, varios o todos los campos del préstamo (fecha de devolución, estado, etc.).
- El sistema debe validar que la fecha de devolución sea mayor a la fecha del préstamo.
- El sistema debe validar que el estado del préstamo sea uno de los permitidos ('Loaned', 'Returned', 'Damaged').
- El sistema debe validar que el socio asociado con member_id exista y su categoría sea igual a "Senior" o "Lifetime".
- Si la edición es correcta, debe retornar los nuevos datos del préstamo actualizados.

## Diseño Técnico (RFC)

### Contrato de API (@alentapp/shared)

Se utilizará el paquete compartido para definir el cuerpo de la petición. Todos los campos son opcionales ya que se trata de una actualización parcial (PATCH a nivel de negocio, aunque el endpoint implemente PUT).

- Endpoint: `PUT /api/v1/equipment-loans/:id`
- Request Body (UpdateEquipmentLoanRequest):

```ts
{
    item_name?: string;
    status?: 'Loaned' | 'Returned' | 'Damaged';
    loan_date?: string;
    due_date?: string;
    member_id?: string;
}
```

### Componentes de Arquitectura Hexagonal

1. **Puerto**: `EquipmentLoanRepository` (Método `update(id, data)`).
2. **Servicio de Dominio**: `EquipmentLoanValidator` (Encargado de reutilizar validaciones de fecha de devolución, socio y estado).
3. **Caso de Uso**: `UpdateEquipmentLoanUseCase` (Orquesta la validación y llama al repositorio).
4. **Adaptador de Salida**: `PostgresEquipmentLoanRepository` (Actualización usando el método `update` de Prisma).
5. **Adaptador de Entrada**: `EquipmentLoanController` (Ruta HTTP que extrae el `id` de la URL y mapea excepciones a códigos HTTP).

## Casos de Borde y Errores

| Escenario                  | Resultado Esperado                            | Código HTTP actual        |
| -------------------------- | --------------------------------------------- | ------------------------- |
| Préstamo inexistente       | Mensaje: "El préstamo no existe"              | 404 Not Found             |
| Estado inválido           | Mensaje: "El estado del préstamo no es válido" | 400 Bad Request           |
| Miembro Cadete             | Mensaje: "La categoría del socio no le permite tomar prestamos"   | 400 Bad Request           |
| Fecha de devolución esperada inválida | Mensaje: "La fecha de devolución esperada debe ser mayor a la fecha del préstamo" | 400 Bad Request           |
| Miembro no existe | Mensaje: "El socio no existe" | 404 Not Found |
| Error de conexión a DB     | Mensaje: "Error interno, reintente más tarde" | 500 Internal Server Error |

## Plan de Implementación

1. Actualizar las interfaces en el paquete `@alentapp/shared` (`UpdateEquipmentLoanRequest`).
2. Ampliar el `EquipmentLoanRepository` con el método `update`.
3. Implementar la lógica en `UpdateEquipmentLoanUseCase` utilizando el `EquipmentLoanValidator` centralizado.
4. Crear la ruta `PUT` en el controlador y enlazarla a la app de Fastify.
5. Consumir el endpoint desde el servicio de Frontend y reutilizar el modal de creación para permitir la edición.
