---
id: 0009
estado: Propuesto
autor: Santiago Andrada
fecha: 2026-04-30
titulo: Eliminación de Certificados Medicos Existentes
---

# TDD-0009: Eliminación de Certificados Medicos Existentes

## Contexto de Negocio (PRD)

### Objetivo

Permitir a los administrativos dar de baja permanentemente a un certificado medico del sistema, eliminando su registro de la base de datos para deshabilitar la habilitación del miembro asociado.

### User Persona

- Nombre: Oscar (Administrativo).
- Necesidad: Borrar un certificado medico que fue cargado por error o que ya no es valido, de forma rápida desde panel de administracion. Necesita una advertencia antes de borrar para no cometer equivocaciones irreparables.

### Criterios de Aceptación

- El sistema debe pedir una confirmación explícita (advertencia visual) antes de proceder con el borrado.
- El sistema debe validar que el certificado exista antes de intentar borrarlo.
- El sistema debe realizar un borrado físico de la base de datos (hard delete).
- Si el borrado es exitoso, la tabla debe actualizarse automáticamente.

## Diseño Técnico (RFC)

### Contrato de API (@alentapp/shared)

Al tratarse de una operación destructiva que solo requiere conocer el identificador, no se envía cuerpo en la petición HTTP.

- Endpoint: `DELETE /api/v1/medical-certificates/:id`
- Request Body: `None`
- Response: `204 No Content` en caso de éxito.

### Componentes de Arquitectura Hexagonal

1. **Puerto**: `MedicalCertificateRepository` (Método `delete(id)`).
2. **Caso de Uso**: `DeleteMedicalCertificateUseCase` (Comprueba existencia previa vía `findById` y delega la eliminación).
3. **Adaptador de Salida**: `PostgresMedicalCertificateRepository` (Eliminación usando el método `delete` de Prisma).
4. **Adaptador de Entrada**: `MedicalCertificateController` (Ruta HTTP que extrae el `id` y devuelve un status 204).

## Casos de Borde y Errores

| Escenario                  | Resultado Esperado                            | Código HTTP actual        |
| -------------------------- | --------------------------------------------- | ------------------------- |
| Certificado inexistente          | Mensaje: "El certificado no existe"               | 400 Bad Request           |
| Error de conexión a DB     | Mensaje: "Error interno, reintente más tarde" | 500 Internal Server Error |
| Eliminación exitosa        | Respuesta vacía                               | 204 No Content            |

## Plan de Implementación

1. Ampliar el `MedicalCertificateRepository` y `PostgresMedicalCertificateRepository` con el método `delete`.
2. Crear la lógica de negocio en `DeleteMedicalCertificateUseCase`.
3. Crear el endpoint `DELETE /api/v1/medical-certificate/:id` en el `MedicalCertificateController` y registrarlo en `app.ts`.
4. Añadir el método `delete` al servicio Frontend (`medicalCertificates.ts`).
5. Enlazar el botón de eliminación en `MedicalCertificatesView.tsx` agregando la confirmación del navegador (`window.confirm`) antes de hacer la llamada.
