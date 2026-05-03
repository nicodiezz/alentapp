---
id: 0006
estado: Implementado
autor: Ramiro Gil
fecha: 2026-05-01
titulo: Cancelación de Pago Existente
---

# TDD-0006: Cancelación de Pago Existente

## Contexto de Negocio (PRD)

### Objetivo

Permitir a los administrativos anular un pago desde el sistema, cambiando su estado a Canceled, sin eliminar físicamente el registro, garantizando la integridad, consistencia y trazabilidad de los datos.

### User Persona

- Nombre: Alberto (Tesorero/Administrativo).
- Necesidad: Anular un pago que fue cargado por error o que deba invalidarse, de forma rápida desde la misma tabla principal. Necesita una advertencia previa antes de confirmar la acción para evitar cancelaciones equivocadas.

### Criterios de Aceptación

-   El sistema debe pedir una confirmación explícita (advertencia visual) antes de proceder con la anulación.
-   El sistema debe validar que el pago exista antes de intentar anularlo.
-   El sistema debe realizar una anulación lógica, cambiando el estado del pago a "Canceled" (no realizar borrado físico).
-   El sistema debe validar que el pago no se encuentre previamente en estado "Canceled".
-   Si la anulación es exitosa, la tabla debe actualizarse automáticamente.


## Diseño Técnico (RFC)

### Contrato de API (@alentapp/shared)

Al tratarse de una operación de modificación que solo requiere conocer el identificador, no se envía cuerpo en la petición HTTP.

- Endpoint: `PATCH /api/v1/payments/:id`
- Request Body: `None`
- Response: `204 No Content` en caso de éxito.

### Componentes de Arquitectura Hexagonal

1. **Puerto**: `PaymentRepository` (Método `cancel(id)`).
2. **Caso de Uso**: `CancelPaymentUseCase` (Comprueba existencia previa vía `findById` y delega la cancelación).
3. **Adaptador de Salida**: `PostgresPaymentRepository` (Cancelación usando el método `update` de Prisma).
4. **Adaptador de Entrada**: `PaymentController` (Ruta HTTP que extrae el `id` y devuelve un status 204).

## Casos de Borde y Errores

| Escenario                | Resultado Esperado                            | Código HTTP               |
| ------------------------ | --------------------------------------------- | ------------------------- |
| `payment_id` inexistente | Mensaje: "No existe un pago con ese ID"       | 404 Not Found             |
| Pago ya cancelado        | Mensaje: "El pago ya se encuentra cancelado"  | 409 Conflict              |
| Error de conexión a DB   | Mensaje: "Error interno, reintente más tarde" | 500 Internal Server Error |


## Plan de Implementación

1. Ampliar el `PaymentRepository` y `PostgresPaymentRepository` con el método `cancel`.
2. Crear la lógica de negocio en `CancelPaymentUseCase`.
3. Crear el endpoint `PATCH /api/v1/payments/:id` en el `PaymentController` y registrarlo en `app.ts`.
4. Añadir el método `cancel` al servicio Frontend (`payments.ts`).
5. Enlazar el botón de cancelación en `PaymentsView.tsx` agregando la confirmación del navegador (`window.confirm`) antes de hacer la llamada.
