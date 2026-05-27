import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { CreateMedicalCertificateRequest } from '@alentapp/shared';

const mockInvalidateById = vi.fn();

vi.mock('../infrastructure/PostgresMedicalCertificateRepository.js', () => {
	return {
		PostgresMedicalCertificateRepository: class {
			async findAll() { return [{ id: '1', issue_date: '2026-01-01', expiry_date: '2027-01-01', doctor_license: 'MED-123', member_id: 'uuid-member-1', is_validated: false }]; }
			async findById(id: string) { return id === '1' ? { id: '1', issue_date: '2026-01-01', expiry_date: '2027-01-01', doctor_license: 'MED-123', member_id: 'uuid-member-1', is_validated: false } : null; }
			async findActiveByMemberId(memberId: string) { return memberId === 'uuid-member-2' ? { id: 'cert-activo', issue_date: '2025-01-01', expiry_date: '2026-06-01', doctor_license: 'MED-OLD', member_id: 'uuid-member-2', is_validated: false } : null; }
			async invalidateById(id: string) { return mockInvalidateById(id); }
			async create(data: any) { return { id: '2', ...data, is_validated: false }; }
			async update(id: string, data: any) { return { id, ...data }; }
			async delete(id: string) { return; }
		}
	};
});

vi.mock('../infrastructure/PostgresMemberRepository.js', () => {
	return {
		PostgresMemberRepository: class {
			async findById(id: string) {
				return (id === 'uuid-member-1' || id === 'uuid-member-2') ? { id, name: 'Socio Existente' } : null;
			}
		}
	};
});

describe('MedicalCertificate API Integration Tests', () => {
	let app: FastifyInstance;

	beforeAll(async () => {
		app = buildApp();
		await app.ready(); // Esperamos a que todos los plugins (como CORS) carguen
	});

	afterAll(async () => {
		await app.close();
	});



	describe('GET /api/v1/medical-certificates', () => {
		it('debe retornar código 200 y el listado de certificados', async () => {
			const response = await app.inject({
				method: 'GET',
				url: '/api/v1/medical-certificates'
			});

			expect(response.statusCode).toBe(200);
			const body = JSON.parse(response.payload);
			expect(body.data).toBeInstanceOf(Array);
			expect(body.data[0].id).toBe('1');
			expect(body.data[0].doctor_license).toBe('MED-123');
		});
	});



	describe('POST /api/v1/medical-certificates', () => {
		it('debe retornar 201 y crear el certificado', async () => {
			const payload: CreateMedicalCertificateRequest = {
				issue_date: '2026-01-01',
				expiry_date: '2027-01-01',
				doctor_license: 'MED-456',
				member_id: 'uuid-member-1',
			};

			const response = await app.inject({
				method: 'POST',
				url: '/api/v1/medical-certificates',
				payload
			});

			expect(response.statusCode).toBe(201);
			const body = JSON.parse(response.payload);
			expect(body.data.doctor_license).toBe('MED-456');
			expect(body.data.id).toBeDefined();
		});

		it('debe atravesar la capa de validación y retornar 400 si las fechas son inválidas', async () => {
			const payload: CreateMedicalCertificateRequest = {
				issue_date: '2027-01-01',
				expiry_date: '2026-01-01',
				doctor_license: 'MED-789',
				member_id: 'uuid-member-1',
			};

			const response = await app.inject({
				method: 'POST',
				url: '/api/v1/medical-certificates',
				payload
			});

			expect(response.statusCode).toBe(400);
			const body = JSON.parse(response.payload);
			expect(body.error).toBe('La fecha de vencimiento no puede ser previa a la fecha de emision');
		});

		it('debe retornar 404 si el socio indicado no existe', async () => {
			const payload: CreateMedicalCertificateRequest = {
				issue_date: '2026-01-01',
				expiry_date: '2027-01-01',
				doctor_license: 'MED-789',
				member_id: 'uuid-inexistente',
			};

			const response = await app.inject({
				method: 'POST',
				url: '/api/v1/medical-certificates',
				payload
			});

			expect(response.statusCode).toBe(404);
			const body = JSON.parse(response.payload);
			expect(body.error).toBe('El socio indicado no existe');
		});

		it('debe retornar 400 si faltan campos requeridos en el payload', async () => {
			const payload = {
				issue_date: '2026-01-01',
			};

			const response = await app.inject({
				method: 'POST',
				url: '/api/v1/medical-certificates',
				payload
			});

			expect(response.statusCode).toBe(400);
			const body = JSON.parse(response.payload);
			expect(body.error).toBe('Todos los campos son requeridos');
		});

		it('debe invalidar el certificado activo previo y crear el nuevo exitosamente si el socio ya tenía uno', async () => {
			mockInvalidateById.mockResolvedValue(undefined);

			const payload: CreateMedicalCertificateRequest = {
				issue_date: '2026-06-01',
				expiry_date: '2027-06-01',
				doctor_license: 'MED-NEW',
				member_id: 'uuid-member-2',
			};

			const response = await app.inject({
				method: 'POST',
				url: '/api/v1/medical-certificates',
				payload
			});

			expect(response.statusCode).toBe(201);
			const body = JSON.parse(response.payload);
			expect(body.data.doctor_license).toBe('MED-NEW');
			expect(body.data.id).toBeDefined();
			expect(mockInvalidateById).toHaveBeenCalledWith('cert-activo');
		});
	});



	describe('DELETE /api/v1/medical-certificates/:id', () => {
		it('debe retornar 204 si se elimina correctamente', async () => {
			const response = await app.inject({
				method: 'DELETE',
				url: '/api/v1/medical-certificates/1'
			});

			expect(response.statusCode).toBe(204);
			expect(response.payload).toBe('');
		});

		it('debe retornar 400 si el certificado a eliminar no existe', async () => {
			const response = await app.inject({
				method: 'DELETE',
				url: '/api/v1/medical-certificates/999'
			});

			expect(response.statusCode).toBe(400);
			const body = JSON.parse(response.payload);
			expect(body.error).toBe('El certificado no existe');
		});
	});
});