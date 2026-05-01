---
id: 0004
estado: Propuesto
autor: Franco Arce
fecha: 2026-05-02
titulo: Registro de Nuevos Casilleros
---
# TDD-0004: Registro de Nuevos Casilleros

## Contexto de Negocio (PRD)

### Objetivo

Permitir el registro de nuevos casilleros en el sistema de forma digital, evitando conflictos de asignación y asegurando que cada casillero sea identificable de manera única.

### User Persona

- Nombre: Carina (Coordinadora de instalaciones).
- Necesidad: Registrar casilleros rápidamente y sin errores, garantizando que no existan duplicados ni estados inválidos.

### Criterios de Aceptación

- El sistema debe validar que el número de casillero `number` sea único.
- El sistema debe permitir registrar la ubicación del casillero.
- Al finalizar, el sistema debe mostrar un mensaje de éxito y limpiar el formulario.
- El casillero debe quedar con estado `"Available"` por defecto.

## Diseño Técnico (RFC)

### Modelo de Datos

Se definirá la entidad `Locker` con las siguientes propiedades y restricciones:

- `id`: Identificador único universal (UUID).
- `number`: Número de casillero, entero, único e indexado.
- `location`: Cadena de texto que indica la ubicación física.
- `status`: Enumeración (`Available`, `Occupied`, `Maintenance`).
- `member_id`: UUID opcional (nullable), referencia al socio asignado.

### Contrato de API (@alentapp/shared)

- Endpoint: `POST /api/v1/lockers`
- Request Body (CreateLockerRequest):

```ts
{
    number: number;
    location: string;
}
```

### Componentes de Arquitectura Hexagonal

1. Puerto: LockerRepository (Interface en el Dominio).
2. Caso de Uso: CreateLocker (Lógica que verifica que el número de casillero no exista y asigna estado `"Available"` por defecto).
3. Adaptador de Salida: PostgresLockerRepository (Implementación real en BD).
4. Adaptador de Entrada: LockerController (Ruta HTTP).

## Casos de Borde y Errores

| Escenario                      | Resultado Esperado                                  | Código HTTP              |
| ------------------------------ | --------------------------------------------------- | ------------------------- |
| Número de casillero duplicado | Mensaje: "Ya existe un casillero con ese número"   | 409 Conflict              |
| Faltan campos obligatorios     | Mensaje de validación indicando el campo requerido | 400 Bad Request           |
| Error de conexión a BD        | Mensaje: "Error interno, reintente más tarde"      | 500 Internal Server Error |

## Plan de Implementación

1. Definir esquema de persistencia y correr migración.
2. Crear tipos en shared y puerto en el Dominio.
3. Implementar el repositorio y el caso de uso.
4. Crear formulario en React y conectar con el endpoint del backend.
