---
id: 0019
estado: Propuesto
autor: Nicolás Diez
fecha: 2026-05-01
titulo: Registro de Préstamo de Equipo
---

# TDD-0019: Registro de Préstamo de Equipo

## Contexto de Negocio (PRD)

### Objetivo

Permitir que un usuario administrador registre un préstamo de equipo deportivo a un socio, especificando el equipo, el socio y la fecha de devolución prevista.

### User Persona

- Nombre: Alberto (Tesorero/Administrativo).
- Necesidad: Poder llevar registro de los equipamientos que el club presta a los socios para evitar equipos perdidos, devoluciones demoradas, entre otros.

### Criterios de Aceptación

- El sistema debe validar que due_date sea mayor a la fecha del préstamo.
- El sistema debe validar que el socio asociado con member_id exista y su categoría sea igual a "Senior" o "Lifetime".
- Al finalizar, el sistema debe mostrar un mensaje de éxito y limpiar el formulario.
- El préstamo debe quedar guardado con estado "Loaned" por defecto.

## Diseño Técnico (RFC)

### Modelo de Datos

Se definirá la entidad `EquipmentLoan` con las siguientes propiedades y restricciones:

- `id`: Identificador único universal (UUID).
- `item_name`: Cadena de texto.
- `status`: Enumeración (`Loaned`, `Returned`, `Damaged`) con valor por defecto `Loaned`.
- `loan_date`: Fecha.
- `due_date`: Fecha.
- `member_id`: UUID FK a Member.

### Contrato de API (@alentapp/shared)

Definiremos los tipos en el paquete compartido para asegurar sincronización:

- Endpoint: `POST /api/v1/equipment-loans`
- Request Body (CreateEquipmentLoanRequest):

```ts
{
    item_name: string;
    loan_date: string;
    due_date: string;
    member_id: string;
}
```

### Componentes de Arquitectura Hexagonal

1. Puerto: EquipmentLoanRepository (Interface en el Dominio).
2. Caso de Uso: CreateEquipmentLoan (Lógica que verifica si due_date es mayor a la loan_date y si el socio asociado con member_id existe y su categoría es igual a "Senior" o "Lifetime").
3. Adaptador de Salida: DB persistence adapter (Implementación real en BD).
4. Adaptador de Entrada: EquipmentLoanController (Ruta HTTP).

## Casos de Borde y Errores

| Escenario                  | Resultado Esperado                            | Código HTTP               |
| -------------------------- | --------------------------------------------- | ------------------------- |
| Miembro Cadete             | Mensaje: "La categoría del socio no le permite tomar prestamos"   | 400 Bad Request           |
| Fecha de devolución esperada inválida | Mensaje: "La fecha de devolución esperada debe ser mayor a la fecha del préstamo" | 400 Bad Request           |
| Miembro no existe | Mensaje: "El socio no existe" | 404 Not Found |
| Error de conexión a DB     | Mensaje: "Error interno, reintente más tarde" | 500 Internal Server Error |

## Plan de Implementación

1. Definir esquema de persistencia y correr migración.
2. Crear tipos en shared y puerto en el Dominio.
3. Implementar el repositorio y el caso de uso.
4. Crear formulario en React y conectar con el endpoint del backend.
