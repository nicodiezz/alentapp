
---
id:0013
estado: Propuesto
autor: Franco Arce
fecha: 2026-05-01
titulo: Registro de Nuevos Deportes
---
# TDD-0013: Registro de Nuevos Deportes

## Contexto de Negocio (PRD)

### Objetivo

Permitir crear nuevos deportes en el sistema para ampliar la oferta de actividades deportivas disponibles.

### User Persona

- Nombre: Silvia (Coordinadora de Actividades).
- Necesidad: Registrar nuevos deportes con datos completos y validaciones claras para poder gestionarlos en el sistema sin cargar información incorrecta.

### Criterios de Aceptación

- El sistema debe validar que el nombre sea único y no vacío.
- El sistema debe validar que la capacida máxima sea un número entero mayor a cero.
- Al finalizar, el deporte debe quedar registrado y disponible para futuras inscripcciones al mismo.

## Diseño Técnico (RFC)

### Modelo de Datos

La entidad `Sport` tendrá los siguientes campos:

- `id`: Identificador único universal (UUID).
- `name`: Cadena de texto, único.
- `description`: Cadena de texto.
- `max_capacity`: Entero, mayor a 0.
- `additional_price`: Decimal/float.
- `requires_medical_certificate`: Booleano.

### Contrato de API (@alentapp/shared)

- Endpoint: `POST /api/v1/sports`
- Request Body (CreateSportRequest):

```ts
{
    name: string;
    description: string;
    max_capacity: number;
    additional_price: number;
    requires_medical_certificate: boolean;
}
```

### Componentes de Arquitectura Hexagonal

1. Puerto: SportRepository (Interface en el Dominio).
2. Caso de Uso: CreateSport (Lógica que verifica que la capacida máxima sea un número entero mayor a cero y que el nombre sea único y no vacío).
3. Adaptador de Salida: PostgresSportRepository (Implementación real en BD).
4. Adaptador de Entrada: SportController (Ruta HTTP).

## Casos de Borde y Errores

| Escenario                             | Resultado Esperado                                    | Código HTTP              |
| ------------------------------------- | ----------------------------------------------------- | ------------------------- |
| Nombre ya registrado                  | Mensaje: "Ya existe un deporte con ese nombre"        | 409 Conflict              |
| `max_capacity` igual o menor a cero | Mensaje: "La capacidad máxima debe ser mayor a cero" | 400 Bad Request           |
| Faltan campos obligatorios            | Mensaje de validación indicando el campo requerido   | 400 Bad Request           |
| Error de conexión a BD               | Mensaje: "Error interno, reintente más tarde"        | 500 Internal Server Error |

## Plan de Implementación

1. Definir esquema de persistencia y correr migración.
2. Crear tipos en shared y puerto en el Dominio.
3. Implementar el repositorio y el caso de uso.
4. Crear formulario en React y conectar con el endpoint del backend.
