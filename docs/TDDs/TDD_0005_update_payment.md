---
id: 0005
estado: Propuesto
autor: Ramiro Gil
fecha: 2026-05-01
titulo: Actualización de un Pago existente
---

# TDD-0005: Actualización de un Pago existente

## Contexto de Negocio (PRD)

### Objetivo

Permitir a los administrativos corregir o modificar la información de un pago existente en el sistema, como su estado, fecha de pago o información que hayan cambiado o se hayan ingresado incorrectamente.

### User Persona

- Nombre: Alberto (Tesorero/Administrativo).
- Necesidad: Permitir la modificación de datos de un pago desde la tabla del panel de administración, posibilitando actualizar su estado (por ejemplo, de Pending a Paid) o corregir información ingresada incorrectamente, como el monto.

### Criterios de Aceptación

* El sistema debe permitir actualizar uno, varios o todos los campos del pago.
* El sistema debe validar que el `payment` exista en la base de datos.
* El sistema debe validar que, si se envía `member_id`, exista en la base de datos.
* El sistema debe validar que, si se envía `amount`, sea numérico y mayor a 0.
* El sistema debe validar que, si se envía `month`, sea numérico y esté en el rango 1 a 12.
* El sistema debe validar que, si se envía `year`, sea numérico y mayor igual al año actual.
* El sistema debe validar que, si se envía `due_date`, esté en formato date.
* El sistema debe validar que, si se envía `payment_date`, esté en formato date y sea nullable.
* El sistema debe validar que, si se envía `status`, sea "Pending" o "Paid".
* El sistema debe validar que:
  * Si status="Pending" entonces payment_date debe ser null.
  * Si status="Paid" entonces payment_date no debe ser null.
* Si la modificación es correcta, debe retornar los nuevos datos del pago actualizados.


## Diseño Técnico (RFC)

### Contrato de API (@alentapp/shared)

Se utilizará el paquete compartido para definir el cuerpo de la petición. Todos los campos son opcionales ya que se trata de una actualización parcial (PATCH a nivel de negocio, aunque el endpoint implemente PUT).

- Endpoint: `PUT /api/v1/payments/:id`
- Request Body (UpdatePaymentRequest):

```ts
{
    member_id?: string,
    amount?: number,
    month?: number,
    year?: number,
    status?: "Pending" | "Paid",
    due_date?: string,
    payment_date?: string | null,
}

```

### Componentes de Arquitectura Hexagonal

1. **Puerto**: `PaymentRepository` (Método `update(id, data)`).
2. **Servicio de Dominio**: `PaymentValidator` (Encargado de reutilizar validaciones de `member_id`, `amount`, `month`, `year`, `date_due`, `payment_date`, `status`).
3. **Caso de Uso**: `UpdatePaymentUseCase` (Lógica que verifica si el `payment` ya existe antes de llamar al repositorio).
4. **Adaptador de Salida**: `PostgresPaymentRepository` (Actualización usando el método `update` de Prisma).
5. **Adaptador de Entrada**: `PaymentController` (Ruta HTTP que extrae el `id` de la URL y mapea excepciones a códigos HTTP).

## Casos de Borde y Errores

| Escenario                               | Resultado Esperado                                                    | Código HTTP               |
| --------------------------------------- | --------------------------------------------------------------------- | ------------------------- |
| `payment_id` no encontrado              | Mensaje: "No existe un pago con ese ID"                               | 404 Not Found             |
| `member_id` no encontrado               | Mensaje: "No existe un miembro con ese ID"                            | 404 Not Found             |
| `amount` con formato inválido           | Monto inválido                                                        | 400 Bad Request           |
| `month` con formato inválido            | Mes inválido                                                          | 400 Bad Request           |
| `year` con formato inválido             | Año inválido                                                          | 400 Bad Request           |
| `status` con formato inválido           | El status debe ser "Pending" o "Paid"                                 | 400 Bad Request           |
| `due_date` con formato inválido         | Fecha de vencimiento inválida                                         | 400 Bad Request           |
| `payment_date` con formato inválido     | Fecha de pago inválida                                                | 400 Bad Request           |
| `status = "Paid"` sin `payment_date`    | Mensaje: "La fecha de pago es obligatoria"   | 400 Bad Request           |
| `status = "Pending"` con `payment_date` | Mensaje: "La fecha de pago debe ser null" | 400 Bad Request           |
| Error de conexión a DB                  | Mensaje: "Error interno, reintente más tarde"                         | 500 Internal Server Error |


## Plan de Implementación

1. Actualizar las interfaces en el paquete `@alentapp/shared` (`UpdatePaymentRequest`).
2. Ampliar el `PaymentRepository` con el método `update`.
3. Implementar la lógica en `UpdatePaymentUseCase` utilizando el `PaymentValidator` centralizado.
4. Crear la ruta `PUT` en el controlador y enlazarla a la app de Fastify.
5. Consumir el endpoint desde el servicio de Frontend y reutilizar el modal de creación para permitir la edición.
