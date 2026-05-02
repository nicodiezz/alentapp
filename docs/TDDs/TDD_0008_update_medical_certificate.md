---
id: 0008
estado: Propuesto
autor: Santiago Andrada
fecha: 2026-04-30
titulo: Actualización de Certificados Medicos
---

# TDD-0008: Actualización de Certificados Medicos

## Contexto de Negocio (PRD)

### Objetivo

Permitir al administrativo modificar la informacion de un certificado medico existente, como su fecha de vencimiento o su estado de validacion, en caso de que hayan cambiado o se hayan ingresado incorrectamente.

### User Persona

- Nombre: Pedro (Administrativo).
- Necesidad: Modificar datos de un certificado medico existente desde el panel de administración. Por ejemplo, corregir una fecha de vencimiento mal ingresada o validar un ceretificado.

### Criterios de Aceptación

- El sistema debe permitir actualizar uno, varios o todos los campos del certificado.
- El sistema debe validar que, si se modifican las fechas,`expiry_date` continue siendo posterior a `issue_date`.
- El sistema debe validar que el certificado a modificar exista.
- Si la edición es correcta, debe retornar los nuevos datos del certificado actualizados.

## Diseño Técnico (RFC)

### Contrato de API (@alentapp/shared)

Se utilizará el paquete compartido para definir el cuerpo de la petición. Todos los campos son opcionales ya que se trata de una actualización parcial (PATCH a nivel de negocio, aunque el endpoint implemente PUT).

- Endpoint: `PUT /api/v1/medical-certificates/:id`
- Request Body (UpdateMedicalCertificateRequest):

```ts
{
    issue_date?: string;
    expiry_date?: string;
    doctor_license?: string;
    is_validated?: boolean;
}
```

### Componentes de Arquitectura Hexagonal

1. **Puerto**: `MedicalCertificateRepository` (Método `update(id, data)`).
2. **Servicio de Dominio**: `MedicalCertificateValidator` (Encargado de reutilizar validaciones de fechas).
3. **Caso de Uso**: `UpdateMedicalCertificateUseCase` (Orquesta la validación y llama al repositorio).
4. **Adaptador de Salida**: `PostgresMedicalCertificateRepository` (Actualización usando el método `update` de Prisma).
5. **Adaptador de Entrada**: `MedicalCertificateController` (Ruta HTTP que extrae el `id` de la URL y mapea excepciones a códigos HTTP).

## Casos de Borde y Errores

| Escenario                  | Resultado Esperado                            | Código HTTP actual        |
| -------------------------- | --------------------------------------------- | ------------------------- |
| Certificado inexistente          | Mensaje: "El certificado no existe"               | 400 Bad Request           |
| `expiry_date` anterior a `issue_date` | Mensaje: "La fecha de vencimiento no puede ser previa a la fecha de emisión" | 400 Bad Request |
| Fecha con formato inválido | Mensaje: "Formato de fecha inválido"| 400 Bad Request        |
| Error de conexión a DB     | Mensaje: "Error interno, reintente más tarde" | 500 Internal Server Error |

## Plan de Implementación

1. Actualizar las interfaces en el paquete `@alentapp/shared` (`UpdateMedicalCertificateRequest`).
2. Ampliar el `MedicalCertificateRepository` con el método `update`.
3. Implementar la lógica en `UpdateMedicalCertificateUseCase` utilizando el `MedicalCertificateValidator` centralizado.
4. Crear la ruta `PUT` en el controlador y enlazarla a la app de Fastify.
5. Consumir el endpoint desde el servicio de Frontend y reutilizar el modal de creación para permitir la edición.
