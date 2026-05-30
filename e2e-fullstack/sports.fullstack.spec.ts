import { test, expect } from '@playwright/test';

/**
 * Tests E2E Full-Stack para la vista de Deportes.
 * NO hay ningún mock de red. Playwright interactúa con:
 *   - El Frontend React en http://localhost:5174
 *   - La API Fastify real en http://localhost:3001
 *   - La base de datos PostgreSQL de test (alentapp_test_db)
 *
 * El global-setup se encarga de limpiar la DB antes de correr la suite,
 * por lo que cada test empieza desde un estado conocido y limpio.
 */

test.describe('Sports Full-Stack E2E', () => {

  test('debe mostrar el estado vacío cuando no hay deportes en la DB', async ({ page }) => {
    await page.goto('/sports');
    await expect(page.getByText('No se encontraron deportes.')).toBeVisible({ timeout: 10000 });
  });

  test('debe crear un deporte real y mostrarlo en la tabla', async ({ page }) => {
    await page.goto('/sports');

    // Abrir modal de creación
    await page.getByRole('button', { name: /Agregar Deporte/i }).click();
    await expect(page.getByText('Agregar Nuevo Deporte')).toBeVisible();

    // Llenar formulario con datos reales
    await page.getByPlaceholder('Ej. Natación').fill('Test E2E Fullstack Sport');
    await page.getByPlaceholder('Ej. Actividad deportiva acuática para socios del club').fill('Deporte creado por test e2e fullstack');
    await page.getByLabel(/Capacidad Máxima/i).fill('24');
    await page.getByLabel(/Precio Adicional/i).fill('1800');

    // Guardar
    await page.getByRole('button', { name: 'Crear Deporte' }).click();

    // Esperar que el modal se cierre y el deporte aparezca en la tabla real
    await expect(page.getByRole('button', { name: 'Crear Deporte' })).toBeHidden();
    await expect(page.getByText('Test E2E Fullstack Sport')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Deporte creado por test e2e fullstack')).toBeVisible();
    await expect(page.getByText('$1800')).toBeVisible();
  });

  test('debe editar el deporte creado y ver el cambio en la tabla', async ({ page }) => {
    await page.goto('/sports');

    // Esperar que el deporte del test anterior esté en la tabla
    await expect(page.getByText('Test E2E Fullstack Sport')).toBeVisible({ timeout: 10000 });

    // Clic en Editar
    await page.getByRole('button', { name: /Editar deporte/i }).first().click();
    await expect(page.getByText('Editar Deporte')).toBeVisible();

    // Cambiar descripción y capacidad
    await page.getByPlaceholder('Ej. Actividad deportiva acuática para socios del club').fill('Deporte editado por test e2e fullstack');
    await page.getByLabel(/Capacidad Máxima/i).fill('30');

    // Guardar
    await page.getByRole('button', { name: 'Guardar Cambios' }).click();
    await expect(page.getByRole('button', { name: 'Guardar Cambios' })).toBeHidden();

    // Verificar cambio en la tabla
    await expect(page.getByText('Deporte editado por test e2e fullstack')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Deporte creado por test e2e fullstack', { exact: true })).toBeHidden();
    await expect(page.getByText('30')).toBeVisible();
  });

  test('debe eliminar el deporte y mostrar el estado vacío', async ({ page }) => {
    await page.goto('/sports');

    // El deporte debería seguir ahí tras el test anterior
    await expect(page.getByText('Test E2E Fullstack Sport')).toBeVisible({ timeout: 10000 });

    // Aceptar el confirm del navegador automáticamente
    page.on('dialog', (dialog) => dialog.accept());

    // Clic en borrar
    await page.getByRole('button', { name: /Eliminar deporte/i }).first().click();

    // La tabla debería quedar vacía
    await expect(page.getByText('No se encontraron deportes.')).toBeVisible({ timeout: 10000 });
  });
});
