import { test, expect } from '@playwright/test';

test.describe('Lockers E2E (UI Integration)', () => {
    test.beforeEach(async ({ page }) => {
        page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));

        const mockMembersDb = [
            {
                id: 'member-1',
                dni: '12345678',
                name: 'Socio Playwright',
                email: 'socio@playwright.dev',
                birthdate: '1990-01-01',
                category: 'Pleno',
                status: 'Activo',
                created_at: new Date().toISOString(),
            },
        ];

        const mockLockersDb: any[] = [
            {
                id: '1',
                number: 10,
                location: 'Vestuario A',
                status: 'Available',
                member_id: null,
            },
        ];

        await page.route(/\/api\/v1\/socios/, async (route) => {
            const method = route.request().method();
            if (method === 'GET') {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ data: mockMembersDb }),
                });
            } else if (method === 'OPTIONS') {
                await route.fulfill({
                    status: 200,
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                    },
                });
            } else {
                await route.continue();
            }
        });

        await page.route(/\/api\/v1\/lockers/, async (route) => {
            const method = route.request().method();

            if (method === 'GET') {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ data: mockLockersDb }),
                });
            } else if (method === 'POST') {
                const payload = route.request().postDataJSON();
                const newLocker = {
                    id: String(mockLockersDb.length + 1),
                    status: 'Available',
                    member_id: null,
                    ...payload,
                };
                mockLockersDb.push(newLocker);
                await route.fulfill({
                    status: 201,
                    contentType: 'application/json',
                    body: JSON.stringify({ data: newLocker }),
                });
            } else if (method === 'OPTIONS') {
                await route.fulfill({
                    status: 200,
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                    },
                });
            } else if (method === 'PUT') {
                const urlObj = new URL(route.request().url());
                const id = urlObj.pathname.split('/').pop();
                const payload = route.request().postDataJSON();
                const index = mockLockersDb.findIndex((l) => String(l.id) === String(id));
                if (index > -1) {
                    mockLockersDb[index] = { ...mockLockersDb[index], ...payload };
                    await route.fulfill({
                        status: 200,
                        contentType: 'application/json',
                        body: JSON.stringify({ data: mockLockersDb[index] }),
                    });
                } else {
                    await route.fulfill({
                        status: 404,
                        body: JSON.stringify({ error: 'El casillero no existe' }),
                    });
                }
            } else if (method === 'DELETE') {
                const urlObj = new URL(route.request().url());
                const id = urlObj.pathname.split('/').pop();
                const index = mockLockersDb.findIndex((l) => String(l.id) === String(id));
                if (index > -1) {
                    mockLockersDb.splice(index, 1);
                }
                await route.fulfill({ status: 204 });
            } else {
                await route.continue();
            }
        });

        await page.goto('/lockers');
    });

    test('debe mostrar la lista de casilleros cargada desde el network interceptado', async ({ page }) => {
        await expect(page.getByText('10')).toBeVisible();
        await expect(page.getByText('Vestuario A')).toBeVisible();
    });

    test('debe abrir el modal de creación y crear un nuevo casillero', async ({ page }) => {
        await page.getByRole('button', { name: /Agregar Casillero/i }).click();

        await expect(page.getByText('Agregar Nuevo Casillero')).toBeVisible();

        // El input de número tiene type="number" sin placeholder, usamos el label
        await page.getByLabel('Número', { exact: false }).fill('99');
        await page.getByPlaceholder('Ej. Vestuario A').fill('Vestuario E2E');

        await page.getByRole('button', { name: 'Crear Casillero' }).click();

        await expect(page.getByRole('button', { name: 'Crear Casillero' })).toBeHidden();
        await expect(page.getByText('Vestuario E2E')).toBeVisible();
    });

    test('debe abrir el modal de edición, actualizar ubicación y mostrar el cambio', async ({ page }) => {
        await page.getByRole('button', { name: /Editar/i }).first().click();

        await expect(page.getByText('Editar Casillero')).toBeVisible();

        await page.getByPlaceholder('Ej. Vestuario A').fill('Vestuario Modificado');

        await page.getByRole('button', { name: 'Guardar Cambios' }).click();

        await expect(page.getByRole('button', { name: 'Guardar Cambios' })).toBeHidden();
        await expect(page.getByText('Vestuario Modificado')).toBeVisible();
    });

    test('debe poder eliminar un casillero tras aceptar la confirmación', async ({ page }) => {
        page.on('dialog', (dialog) => dialog.accept());

        await expect(page.getByText('Vestuario A')).toBeVisible();

        await page.getByRole('button', { name: /Eliminar/i }).first().click();

        await expect(page.getByText('No se encontraron casilleros.')).toBeVisible();
        await expect(page.getByText('Vestuario A')).toBeHidden();
    });
});
