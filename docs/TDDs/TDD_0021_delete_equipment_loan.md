---
id: 0021
estado: Propuesto
autor: Nicolás Diez
fecha: 2026-05-02
titulo: Eliminación de Préstamos de Equipamientos Existentes
---

# TDD-0021: Eliminación de Préstamos de Equipamientos Existentes

## Contexto de Negocio (PRD)

### Objetivo

Permitir a los administrativos dar de baja permanentemente a un préstamo de equipamiento del sistema, eliminando su registro de la base de datos para mantener la lista libre de registros incorrectos.

### User Persona

- Nombre: Alberto (Tesorero/Administrativo).
- Necesidad: Borrar un préstamo de equipamiento que fue cargado por error o a modo de prueba. Necesita una advertencia antes de borrar para no cometer equivocaciones irreparables.

### Criterios de Aceptación

- El sistema debe pedir una confirmación explícita (advertencia visual) antes de proceder con el borrado.
- El sistema debe validar que el préstamo de equipamiento exista antes de intentar borrarlo.
- El sistema debe realizar un borrado físico de la base de datos (hard delete).
- Si el borrado es exitoso, la tabla debe actualizarse automáticamente.

## Diseño Técnico (RFC)

### Contrato de API (@alentapp/shared)

Al tratarse de una operación destructiva que solo requiere conocer el identificador, no se envía cuerpo en la petición HTTP.

- Endpoint: `DELETE /api/v1/equipment-loans/:id`
- Request Body: `None`
- Response: `204 No Content` en caso de éxito.

### Componentes de Arquitectura Hexagonal

1. **Puerto**: `EquipmentLoanRepository` (Método `delete(id)`).
2. **Caso de Uso**: `DeleteEquipmentLoanUseCase` (Comprueba existencia previa vía `findById` y delega la eliminación).
3. **Adaptador de Salida**: `PostgresEquipmentLoanRepository` (Eliminación usando el método `delete` de Prisma).
4. **Adaptador de Entrada**: `EquipmentLoanController` (Ruta HTTP que extrae el `id` y devuelve un status 204).

## Casos de Borde y Errores

| Escenario                  | Resultado Esperado                            | Código HTTP actual        |
| -------------------------- | --------------------------------------------- | ------------------------- |
| Préstamo de equipamiento inexistente | Mensaje: "El préstamo de equipamiento no existe"               | 404 Not Found           |
| Error de conexión a DB     | Mensaje: error del motor de base de datos     | 500 Internal Server Error |
| Eliminación exitosa        | Respuesta vacía                               | 204 No Content            |

## Plan de Implementación

1. Ampliar el `EquipmentLoanRepository` y `PostgresEquipmentLoanRepository` con el método `delete`.
2. Crear la lógica de negocio en `DeleteEquipmentLoanUseCase`.
3. Crear el endpoint `DELETE /api/v1/equipment-loans/:id` en el `EquipmentLoanController` y registrarlo en `app.ts`.
4. Añadir el método `delete` al servicio Frontend (`equipment-loans.ts`).
5. Enlazar el botón de eliminación en `EquipmentLoansView.tsx` agregando la confirmación del navegador (`window.confirm`) antes de hacer la llamada.
