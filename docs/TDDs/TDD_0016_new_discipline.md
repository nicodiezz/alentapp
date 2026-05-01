---
id: 0016
estado: Propuesto
autor: Dante Barbé
fecha: 2026-05-01
titulo: Registro De Nuevas Suspensiones
---

# TDD-0016: Registro De Nuevas Suspensiones

## Contexto de Negocio (PRD)

### Objetivo

La digitalización del registro de suspenciones significa la eliminación del registro a mano en papel. Facilita el trabajo de la persona encargada, además de que elimina los riesgos de traspapeleo.

### User Persona

- Nombre: Juan (Administrativo).
- Necesidad: Registrar la suspensión de un miembro, garantizando una consistencia temporal entre las fechas de inicio y fin.

### Criterios de Aceptación

- El sistema debe validar que la fecha de inicio sea anterior a la fecha de fin de la suspensión.
- El sistema debe validar que exista un miembro con ese member_id.
- Al finalizar, el sistema debe mostrar un mensaje de éxito y registrar la suspensión en la base de datos.

## Diseño Técnico (RFC)

### Modelo de Datos

Se definirá la entidad `Discipline` con las siguientes propiedades y restricciones:

- `id`: Identificador único universal (UUID).
- `reason`: Cadena de texto.
- `start_date`: Fecha de inicio de la suspensión.
- `end_date`: Fecha de fin de la suspensión, debe ser posterior a la fecha de inicio.
- `is_total_suspension`: Booleano.
- `member_id`: Identificador del socio al que pertenece la suspensión (FK a Member).


### Contrato de API (@alentapp/shared)

- Definiremos los tipos en el paquete compartido para asegurar sincronización:

- Endpoint: `POST /api/v1/discipline`
- Request Body (CreateDisciplineRequest):

```ts
{
    reason: string;
    start_date: string;
    end_date: string;
    is_total_suspension: boolean;
    member_id: string;
}
```

### Componentes de Arquitectura Hexagonal

1. Puerto: DisciplineRepository (Interface en el Dominio).
2. Caso de Uso: CreateDiscipline (Lógica que valida las fechas y verifica si el miembro existe antes de llamar al repositorio).
3. Adaptador de Salida: PostgresDisciplineRepository (Implementación real en BD).
4. Adaptador de Entrada: DisciplineController (Ruta HTTP).

## Casos de Borde y Errores

| Escenario                   | Resultado Esperado                            | Código HTTP               |
| ----------------------------| --------------------------------------------- | ------------------------- |
| `member_id` inexistente          | Mensaje: "El miembro indicado no existe"   | 404 Not Found              |
| Fecha con formato inválido | Mensaje: "Formato de fecha inválido"| 400 Bad Request        |
| `expiry_date` anterior a `issue_date` | Mensaje: "La fecha de fin de suspensión no puede ser previa a la fecha de inicio"| 400 Bad Request           |
| Error de conexión a DB     | Mensaje: "Error interno, reintente más tarde" | 500 Internal Server Error |

## Plan de Implementación

1. Definir esquema de persistencia y correr migración.
2. Crear tipos en shared y puerto en el Dominio.
3. Implementar el repositorio y el caso de uso.
4. Crear formulario en React y conectar con el endpoint del backend.