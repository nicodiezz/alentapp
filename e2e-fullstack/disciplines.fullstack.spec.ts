import { test, expect } from '@playwright/test';

/**
 * Tests E2E Full-Stack para la vista de Sanciones Disciplinarias.
 * NO hay ningún mock de red. Playwright interactúa con:
 *   - El Frontend React en http://localhost:5174
 *   - La API Fastify real en http://localhost:3001
 *   - La base de datos PostgreSQL de test (alentapp_test_db)
 *
 * El global-setup limpia la DB antes de correr la suite.
 * El beforeAll crea un miembro real via la UI de Miembros,
 * necesario como FK para poder registrar sanciones.
 */

test.describe('Disciplines Full-Stack E2E', () => {

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto('/members');

    await page.getByRole('button', { name: /Agregar Miembro/i }).click();
    await page.getByPlaceholder('Ej. Juan Pérez').fill('Miembro Test Discipline E2E');
    await page.getByPlaceholder('Ej. 12345678').fill('55566677');
    await page.getByPlaceholder('ejemplo@correo.com').fill('discipline@e2e.com');
    await page.getByLabel(/Fecha de Nacimiento/i).fill('1995-06-15');
    await page.getByRole('button', { name: 'Crear Miembro' }).click();

    await expect(page.getByText('Miembro Test Discipline E2E')).toBeVisible({ timeout: 10000 });
    await page.close();
  });

  test('debe mostrar el estado vacío cuando no hay sanciones en la DB', async ({ page }) => {
    await page.goto('/disciplines');
    await expect(page.getByText('No se encontraron sanciones registradas.')).toBeVisible({ timeout: 10000 });
  });

  test('debe crear una sanción real y mostrarla en la tabla', async ({ page }) => {
    await page.goto('/disciplines');

    await page.getByRole('button', { name: /Nueva suspensión/i }).click();
    await expect(page.getByText('Nueva suspensión Disciplinaria')).toBeVisible();

    // Seleccionar miembro (Ark UI select usa data-part como atributos estables)
    await page.locator('[data-part="trigger"]').click();
    await page.locator('[data-part="item"]').first().click();

    await page.getByPlaceholder('Ej. Conducta indebida en partido').fill('Sanción E2E Fullstack');
    await page.getByLabel(/Fecha de inicio/i).fill('2026-06-01');
    await page.getByLabel(/Fecha de vencimiento/i).fill('2026-08-01');

    await page.getByRole('button', { name: 'Crear suspensión' }).click();

    await expect(page.getByRole('button', { name: 'Crear suspensión' })).toBeHidden();
    await expect(page.getByText('Sanción E2E Fullstack')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Miembro Test Discipline E2E')).toBeVisible();
  });

  test('debe editar la sanción creada y ver el cambio en la tabla', async ({ page }) => {
    await page.goto('/disciplines');

    await expect(page.getByText('Sanción E2E Fullstack')).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: /Editar suspensión/i }).first().click();
    await expect(page.getByText('Editar suspensión Disciplinaria')).toBeVisible();

    await page.getByPlaceholder('Ej. Conducta indebida en partido').fill('Sanción E2E Fullstack Editada');

    await page.getByRole('button', { name: 'Guardar Cambios' }).click();
    await expect(page.getByRole('button', { name: 'Guardar Cambios' })).toBeHidden();

    await expect(page.getByText('Sanción E2E Fullstack Editada')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Sanción E2E Fullstack', { exact: true })).toBeHidden();
  });

  test('debe eliminar la sanción y mostrar el estado vacío', async ({ page }) => {
    await page.goto('/disciplines');

    await expect(page.getByText('Sanción E2E Fullstack Editada')).toBeVisible({ timeout: 10000 });

    page.on('dialog', (dialog) => dialog.accept());

    await page.getByRole('button', { name: /Eliminar suspensión/i }).first().click();

    await expect(page.getByText('No se encontraron sanciones registradas.')).toBeVisible({ timeout: 10000 });
  });
});
