---
id: 0004
estado: Propuesto
autor: Ramiro Gil
fecha: 2026-05-01
titulo: Registro de Nuevo Pago
---

# TDD-0004: Registro de Nuevo Pago

## Contexto de Negocio (PRD)

### Objetivo
Digitalizar el registro de pagos de socios, permitiendo que un administrativo registre transacciones de forma digital, garantizando la integridad, trazabilidad y consistencia de los datos desde el momento de su creación.

### User Persona
*   **Nombre**: Alberto (Tesorero/Administrativo)
*   **Necesidad**: Registrar pagos de forma ágil mientras se atiende a miembros en simultáneo, minimizando errores en la carga de montos o asociación al miembro, evitando inconsistencias o duplicaciones de transacciones.

### Criterios de Aceptación
*   El sistema debe validar que `member_id` exista en la base de datos.
*   El sistema debe validar que `amount` sea numérico y mayor a 0 .
*   El sistema debe validar que `month` sea numérico y esté en el rango 1 a 12.
*   El sistema debe validar que `year` esté sea numérico y mayor igual al año actual.
*   El sistema debe validar que `due_date` esté en formato date.
*   El sistema debe validar que `payment_date` esté en formato date, sea nullable y obligatoria si status="Paid".
*   El sistema debe validar que `status` sea "Pending" o "Paid".
*   Al finalizar, el sistema debe mostrar un mensaje de éxito y limpiar el formulario.

## Diseño Técnico (RFC)

### Modelo de Datos

Se definirá la entidad `Payment` con las siguientes propiedades y restricciones:

* `id`: Identificador único universal (UUID).
* `member_id`: UUID que referencia a Member, no nulo.
* `amount`: Número decimal, mayor a 0.
* `month`: Número entero en rango 1 a 12.
* `year`: Número entero mayor o igual al año actual.
* `status`: Enumeración (Pending, Paid).
* `due_date`: Fecha (date), no nula.
* `payment_date`: Fecha (datetime), nullable y obligatoria si status = "Paid".

### Contrato de API (@alentapp/shared)

Definiremos los tipos en el paquete compartido para asegurar sincronización:

- Endpoint: `POST /api/v1/payments`
- Request Body (CreatePaymentRequest):

```ts
{
    member_id: string,
    amount: number,
    month: number,
    year: number,
    status: "Pending" | "Paid",
    due_date: string,
    payment_date?: string | null,
}
```

### Componentes de Arquitectura Hexagonal

1. Puerto: PaymentRepository (Interface en el Dominio).
2. Caso de Uso: CreatePayment (Lógica que verifica si el `member_id` ya existe antes de llamar al repositorio).
3. Adaptador de Salida: DB persistence adapter (Implementación real en BD).
4. Adaptador de Entrada: PaymentController (Ruta HTTP).


## Casos de Borde y Errores
| Escenario                   | Resultado Esperado                            | Código HTTP               |
| ----------------------------| --------------------------------------------- | ------------------------- |
| `member_id` no encontrado   | Mensaje: "No existe un miembro con ese ID"      | 404 Not found              |
| `amount` con Formato inválido| Monto inválido              | 400 Bad Request           |
| `month` con formato inválido| Mes inválido              | 400 Bad Request           |
| `year` con formato inválido| Año inválido              | 400 Bad Request           |
| `status` con formato inválido | El status debe ser "Pendiente" o "Pagado"              | 400 Bad Request           |
| `due_date` con formato inválido | Fecha de vencimiento inválido             | 400 Bad Request           |
| `payment_date` con formato inválido | Fecha de pago inválido             | 400 Bad Request           |
| Error de conexión a DB     | Mensaje: "Error interno, reintente más tarde" | 500 Internal Server Error |

## Plan de Implementación

1. Definir esquema de persistencia y correr migración.
2. Crear tipos en shared y puerto en el Dominio.
3. Implementar el repositorio y el caso de uso.
4. Crear formulario en React y conectar con el endpoint del backend.
