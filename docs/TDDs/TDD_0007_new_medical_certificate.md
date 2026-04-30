---
id: 0007
estado: Propuesto
autor: Santiago Andrada
fecha: 2026-04-30
titulo: Registro de Nuevos Certificados Medicos
---

# TDD-0007: Registro de Nuevos Certificados Medicos

## Contexto de Negocio (PRD)

### Objetivo

Permitir al administrativo registrar un certificado médico para un socio, habilitándolo a realizar actividad física en el club. Es el respaldo legal que garantiza que el socio está apto. Solo puede existir un certificado activo por socio; al registrar uno nuevo, el anterior pasa a histórico.


### User Persona

- Nombre: Alberto (Administrativo).
- Necesidad: Registrar el certificado médico de un socio garantizando de que el socio no quede con dos certificados activos simultáneamente y que las fechas sean válidas.

### Criterios de Aceptación

- El sistema debe validar que la fecha de emisión no sea posterior a la fecha de vencimiento.
- El sistema debe validar que el 'member_id' corresponda a un miembro existente.
- Si el socio ya tiene un certificado activo, el sistema debe marcarlo como inválido antes de crear el nuevo.
- Si el alta es exitosa el certificado medico debe quedar guardado en la base de datos.

## Diseño Técnico (RFC)

### Modelo de Datos

Se definirá la entidad `MedicalCertificate` con las siguientes propiedades y restricciones:

- `id`: Identificador único universal (UUID).
- `issue_date`:  Fecha de emision del certificado.
- `expiry_date`: Fecha de vencimiento, debe ser posterior a `issue_date`.
- `is_validated`: Booleano con valor por defecto `false`.
- `doctor_license`: Cadena de texto.
- `member_id`: Identificador del socio al que pertenece el certificado (FK a Member).

### Contrato de API (@alentapp/shared)

Definiremos los tipos en el paquete compartido para asegurar sincronización:

- Endpoint: `POST /api/v1/medical-certificate`
- Request Body (CreateMedicalCertificateRequest):

```ts
{
    issue_date: string;
    expiry_date: string;
    doctor_license: string;
    member_id: string;
}
```

### Componentes de Arquitectura Hexagonal

1. Puerto: MedicalCertificateRepository (Interface en el Dominio).
2. Caso de Uso: CreateMedicalCertificate (Valida fechas, verifica si el socio existe, invalida certificado previo activo y persiste el nuevo).
3. Adaptador de Salida: PostgresMedicalCertificateRepository (Implementación real en BD).
4. Adaptador de Entrada: MedicalCertificateController (Ruta HTTP).

## Casos de Borde y Errores

| Escenario                  | Resultado Esperado                            | Código HTTP               |
| -------------------------- | --------------------------------------------- | ------------------------- |
| Campos requeridos faltantes          | Mensaje: "Todos los campos son requeridos"   | 400 Bad Request              |
| `expiry_date` anterior a `issue_date` | Mensaje: "La fecha de vencimiento no puede ser previa a la fecha de emisión"| 400 Bad Request           |
| `member_id` inexistente | Mensaje: "El socio indicado no existe" | 404 Not Found |
| Error de conexión a DB     | Mensaje: "Error interno, reintente más tarde" | 500 Internal Server Error |
| Socio ya tiene certificado activo     | Invalida el anterior y crea el nuevo exitosamente  | 201 Created               |

## Plan de Implementación

1. Definir esquema de persistencia y correr migración.
2. Crear tipos en shared y puerto en el Dominio.
3. Implementar el repositorio y el caso de uso.
4. Crear formulario en React y conectar con el endpoint del backend.
