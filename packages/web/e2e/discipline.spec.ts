import { test, expect } from '@playwright/test';

test.describe('Disciplines E2E (UI Integration)', () => {
    test.beforeEach(async ({ page }) => {
        page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));

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

        const mockDisciplinesDb: any[] = [
            {
                id: '1',
                reason: 'Conducta inapropiada',
                issue_date: '2026-01-01',
                expiry_date: '2026-06-01',
                is_total_suspension: false,
                member_id: '1',
            }
        ];

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

        await page.route(/\/api\/v1\/disciplines/, async (route) => {
            const method = route.request().method();

            if (method === 'GET') {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ data: mockDisciplinesDb })
                });
            } else if (method === 'POST') {
                const payload = route.request().postDataJSON();
                const newDiscipline = {
                    id: String(mockDisciplinesDb.length + 1),
                    ...payload
                };
                mockDisciplinesDb.push(newDiscipline);
                await route.fulfill({
                    status: 201,
                    contentType: 'application/json',
                    body: JSON.stringify({ data: newDiscipline })
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
                const index = mockDisciplinesDb.findIndex(d => String(d.id) === String(id));
                console.log('PUT payload', payload, 'found index', index);
                if (index > -1) {
                    mockDisciplinesDb[index] = { ...mockDisciplinesDb[index], ...payload };
                    await route.fulfill({
                        status: 200,
                        contentType: 'application/json',
                        body: JSON.stringify({ data: mockDisciplinesDb[index] })
                    });
                } else {
                    await route.fulfill({ status: 404, body: JSON.stringify({ error: 'La suspensión no existe' }) });
                }
            } else if (method === 'DELETE') {
                const urlObj = new URL(route.request().url());
                const id = urlObj.pathname.split('/').pop();
                const index = mockDisciplinesDb.findIndex(d => String(d.id) === String(id));
                console.log('DELETE id', id, 'found index', index);
                if (index > -1) {
                    mockDisciplinesDb.splice(index, 1);
                }
                await route.fulfill({ status: 204 });
            } else {
                await route.continue();
            }
        });

        await page.goto('/disciplines');
    });

    test('debe mostrar la lista de suspensiones cargada desde el network interceptado', async ({ page }) => {
        await expect(page.getByText('Conducta inapropiada')).toBeVisible();
        await expect(page.getByText('Playwright Tester')).toBeVisible();
    });

    test('debe abrir el modal de creación y enviar el formulario', async ({ page }) => {
        await page.locator('button:has-text("Nueva suspensión")').click();

        await expect(page.getByText('Nueva suspensión Disciplinaria')).toBeVisible();

        await page.getByText('Seleccione un miembro').click();
        await page.getByRole('option', { name: 'Playwright Tester' }).click();

        await page.getByPlaceholder('Ej. Conducta indebida en partido').fill('Suspensión E2E');
        await page.getByLabel(/Fecha de inicio/i).fill('2026-05-01');
        await page.getByLabel(/Fecha de vencimiento/i).fill('2026-08-01');

        await page.getByRole('button', { name: 'Crear suspensión' }).click();

        await expect(page.getByRole('button', { name: 'Crear suspensión' })).toBeHidden();
        await expect(page.getByText('Suspensión E2E')).toBeVisible();
    });

    test('debe abrir el modal de edición, actualizar datos y mostrar el cambio', async ({ page }) => {
        await page.getByRole('button', { name: /Editar suspensión/i }).click();

        await expect(page.getByText('Editar suspensión Disciplinaria')).toBeVisible();

        await page.getByPlaceholder('Ej. Conducta indebida en partido').fill('Conducta inapropiada MODIFICADA');

        await page.getByRole('button', { name: 'Guardar Cambios' }).click();

        await expect(page.getByRole('button', { name: 'Guardar Cambios' })).toBeHidden();
        await expect(page.getByText('Conducta inapropiada MODIFICADA')).toBeVisible();
    });

    test('debe poder eliminar una suspensión tras aceptar la alerta de confirmación', async ({ page }) => {
        page.on('dialog', dialog => dialog.accept());

        await expect(page.getByText('Conducta inapropiada')).toBeVisible();

        await page.getByRole('button', { name: /Eliminar suspensión/i }).click();

        await expect(page.getByText('No se encontraron sanciones registradas.')).toBeVisible();
        await expect(page.getByText('Conducta inapropiada')).toBeHidden();
    });
});
