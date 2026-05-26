import { test, expect } from '@playwright/test';

test.describe('Medical Certificates E2E (UI Integration)', () => {
	test.beforeEach(async ({ page }) => {
		page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));

		// Estado en memoria simulando la Base de Datos para estos tests
		const mockMembersDb = [
			{
				id: '1',
				dni: '12345678',
				name: 'Playwright Tester',
				email: 'test@playwright.dev',
				birthdate: '1990-01-01',
				category: 'Pleno',
				status: 'Activo',
				created_at: new Date().toISOString()
			}
		];

		const mockCertificatesDb: any[] = [
			{
				id: '1',
				issue_date: '2026-01-01',
				expiry_date: '2027-01-01',
				doctor_license: 'MP 99999',
				member_id: '1',
				is_validated: false,
			}
		];

		// Interceptamos llamadas al backend de socios
		await page.route(/\/api\/v1\/socios/, async (route) => {
			const method = route.request().method();

			if (method === 'GET') {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({ data: mockMembersDb })
				});
			} else if (method === 'OPTIONS') {
				await route.fulfill({
					status: 200,
					headers: {
						'Access-Control-Allow-Origin': '*',
						'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
						'Access-Control-Allow-Headers': 'Content-Type, Authorization',
					}
				});
			} else {
				await route.continue();
			}
		});

		// Interceptamos llamadas al backend de certificados médicos
		await page.route(/\/api\/v1\/medical-certificates/, async (route) => {
			const method = route.request().method();

			if (method === 'GET') {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({ data: mockCertificatesDb })
				});
			} else if (method === 'POST') {
				const payload = route.request().postDataJSON();
				const newCertificate = {
					id: String(mockCertificatesDb.length + 1),
					is_validated: false,
					...payload
				};
				// Insertamos en nuestra BD falsa para que el próximo GET lo traiga
				mockCertificatesDb.push(newCertificate);

				await route.fulfill({
					status: 201,
					contentType: 'application/json',
					body: JSON.stringify({ data: newCertificate })
				});
			} else if (method === 'OPTIONS') {
				await route.fulfill({
					status: 200,
					headers: {
						'Access-Control-Allow-Origin': '*',
						'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
						'Access-Control-Allow-Headers': 'Content-Type, Authorization',
					}
				});
			} else if (method === 'PUT') {
				const urlObj = new URL(route.request().url());
				const id = urlObj.pathname.split('/').pop();
				const payload = route.request().postDataJSON();
				const index = mockCertificatesDb.findIndex(c => String(c.id) === String(id));

				console.log('PUT payload', payload, 'found index', index);

				if (index > -1) {
					mockCertificatesDb[index] = { ...mockCertificatesDb[index], ...payload };
					await route.fulfill({
						status: 200,
						contentType: 'application/json',
						body: JSON.stringify({ data: mockCertificatesDb[index] })
					});
				} else {
					await route.fulfill({ status: 400, body: JSON.stringify({ error: 'El certificado no existe' }) });
				}
			} else if (method === 'DELETE') {
				const urlObj = new URL(route.request().url());
				const id = urlObj.pathname.split('/').pop();
				const index = mockCertificatesDb.findIndex(c => String(c.id) === String(id));
				console.log('DELETE id', id, 'found index', index);
				if (index > -1) {
					mockCertificatesDb.splice(index, 1);
				}

				await route.fulfill({ status: 204 });
			} else {
				await route.continue();
			}
		});

		// Navegamos directamente a la vista de certificados médicos
		await page.goto('/medical-certificates');
	});

	test('debe mostrar la lista de certificados cargada desde el network interceptado', async ({ page }) => {
		// Verificamos que nuestro dato simulado esté pintado en la tabla HTML real
		await expect(page.getByText('MP 99999')).toBeVisible();
		await expect(page.getByText('Playwright Tester')).toBeVisible();
	});

	test('debe abrir el modal de creación y enviar el formulario de red', async ({ page }) => {
		// Buscar y clickear en "Registrar Certificado Medico"
		await page.locator('button:has-text("Registrar Certificado Medico")').click();

		// Verificamos que el modal se abrió
		await expect(page.getByText('Agregar Certificado Medico')).toBeVisible();

		// Llenar el formulario simulando tipeo real de usuario
		await page.getByLabel(/Fecha de Emision/i).fill('2026-06-01');
		await page.getByLabel(/Fecha de Vencimiento/i).fill('2027-06-01');
		await page.getByPlaceholder('Ej. MP 12345').fill('MP 11111');

		// Seleccionar miembro desde el Select de Chakra
		await page.getByText('Seleccione un miembro').click();
		await page.getByRole('option', { name: 'Playwright Tester' }).click();

		// Clic en enviar
		await page.getByRole('button', { name: 'Crear Certificado' }).click();

		// Verificamos que el modal se cerró con éxito
		await expect(page.getByRole('button', { name: 'Crear Certificado' })).toBeHidden();

		// Verificamos que el componente hizo refresh (GET) y muestra el nuevo certificado en la tabla
		await expect(page.getByText('MP 11111')).toBeVisible();
	});

	test('debe abrir el modal de edición, actualizar datos y mostrar el cambio', async ({ page }) => {
		// Buscar y clickear en el botón de edición del primer certificado
		await page.getByRole('button', { name: /Editar certificado/i }).click();

		// Verificamos que el modal se abrió con el título correcto
		await expect(page.getByText('Editar Certificado Medico')).toBeVisible();

		// Modificar la matrícula
		await page.getByPlaceholder('Ej. MP 12345').fill('MP 99999 MODIFICADO');

		// Clic en guardar
		await page.getByRole('button', { name: 'Guardar Cambios' }).click();

		// Esperar que se cierre
		await expect(page.getByRole('button', { name: 'Guardar Cambios' })).toBeHidden();

		// Verificar en la tabla
		await expect(page.getByText('MP 99999 MODIFICADO')).toBeVisible();
	});

	test('debe poder eliminar un certificado tras aceptar la alerta de confirmación', async ({ page }) => {
		// Escuchar el evento del dialog "confirm" del navegador y aceptarlo automáticamente
		page.on('dialog', dialog => dialog.accept());

		// Asegurarnos que el certificado está en la tabla antes de borrar
		await expect(page.getByText('MP 99999')).toBeVisible();

		// Clic en borrar
		await page.getByRole('button', { name: /Eliminar certificado/i }).click();

		// Verificar que la tabla se actualice y muestre el empty state
		await expect(page.getByText('No se encontraron certificados medicos.')).toBeVisible();
		await expect(page.getByText('MP 99999')).toBeHidden();
	});
});