import { test, expect } from '@playwright/test';

/**
 * Tests E2E Full-Stack para la vista de Préstamos de Equipamiento.
 * NO hay ningún mock de red. Playwright interactúa con:
 *   - El Frontend React en http://localhost:5173
 *   - La API Fastify real en http://localhost:3001
 *   - La base de datos PostgreSQL de test (alentapp_test_db)
 *
 * El global-setup se encarga de limpiar la DB antes de correr la suite,
 * por lo que cada test empieza desde un estado conocido y limpio.
 *
 * Como `EquipmentLoan` tiene FK a `Member`, primero creamos un socio Pleno
 * usando la API real (vía la UI de miembros) para poder asociarle el préstamo.
 */

test.describe.serial('EquipmentLoans Full-Stack E2E', () => {

  test('debe mostrar el estado vacío cuando no hay préstamos en la DB', async ({ page }) => {
    await page.goto('/equipment-loans');
    await expect(page.getByText('No se encontraron prestamos registrados.')).toBeVisible({ timeout: 10000 });
  });

  test('debe crear primero un socio Pleno para poder asociarle préstamos', async ({ page }) => {
    await page.goto('/members');

    // Abrir modal de creación
    await page.locator('button:has-text("Agregar Miembro")').click();
    await expect(page.getByText('Agregar Nuevo Miembro')).toBeVisible();

    // Llenar formulario con datos reales (mayor de edad para ser Pleno)
    await page.getByPlaceholder('Ej. Juan Pérez').fill('Socio Pleno Loan E2E');
    await page.getByPlaceholder('Ej. 12345678').fill('77788899');
    await page.getByPlaceholder('ejemplo@correo.com').fill('pleno-loan@e2e.com');
    await page.getByLabel(/Fecha de Nacimiento/i).fill('1990-06-15');

    // Guardar
    await page.getByRole('button', { name: 'Crear Miembro' }).click();

    // Esperar que el modal se cierre y el miembro aparezca en la tabla real
    await expect(page.getByRole('button', { name: 'Crear Miembro' })).toBeHidden();
    await expect(page.getByText('Socio Pleno Loan E2E')).toBeVisible({ timeout: 10000 });
  });

  test('debe crear un préstamo real con estado Loaned por defecto y mostrarlo en la tabla', async ({ page }) => {
    await page.goto('/equipment-loans');

    // Abrir modal de creación
    await page.locator('button:has-text("Nuevo prestamo")').click();
    await expect(page.getByText('Nuevo prestamo de equipamiento')).toBeVisible();

    // Seleccionar el socio Pleno creado en el test anterior
    await page.locator('button:has-text("Seleccione un socio")').click();
    await page.getByText('Socio Pleno Loan E2E').click();

    // Llenar el resto del formulario
    await page.getByPlaceholder('Ej. Pelota de futbol').fill('Raqueta E2E Fullstack');
    await page.locator('input[type="date"]').first().fill('2026-05-01');
    await page.locator('input[type="date"]').nth(1).fill('2026-05-15');

    // Guardar (TDD 0019: status por defecto "Loaned" — no hay campo de estado en el modal de creación)
    await page.getByRole('button', { name: 'Crear prestamo' }).click();

    // Esperar que el modal se cierre y el préstamo aparezca en la tabla
    await expect(page.getByRole('button', { name: 'Crear prestamo' })).toBeHidden();
    await expect(page.getByText('Raqueta E2E Fullstack')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Socio Pleno Loan E2E')).toBeVisible();
    await expect(page.getByText('Prestado')).toBeVisible();
  });

  test('debe editar el préstamo creado cambiando su estado y ver el cambio en la tabla', async ({ page }) => {
    await page.goto('/equipment-loans');

    // Esperar que el préstamo del test anterior esté en la tabla
    await expect(page.getByText('Raqueta E2E Fullstack')).toBeVisible({ timeout: 10000 });

    // Clic en Editar
    await page.getByRole('button', { name: /Editar prestamo/i }).first().click();
    await expect(page.getByText('Editar prestamo de equipamiento')).toBeVisible();

    // Cambiar el estado a Devuelto
    await page.locator('button:has-text("Prestado")').click();
    await page.getByText('Devuelto', { exact: true }).click();

    // Guardar
    await page.getByRole('button', { name: 'Guardar Cambios' }).click();
    await expect(page.getByRole('button', { name: 'Guardar Cambios' })).toBeHidden();

    // Verificar cambio en la tabla
    await expect(page.getByText('Devuelto')).toBeVisible({ timeout: 10000 });
  });

  test('debe eliminar el préstamo y mostrar el estado vacío (tras aceptar confirm)', async ({ page }) => {
    await page.goto('/equipment-loans');

    // El préstamo debería seguir ahí tras el test anterior
    await expect(page.getByText('Raqueta E2E Fullstack')).toBeVisible({ timeout: 10000 });

    // Aceptar el confirm del navegador automáticamente (TDD 0021)
    page.on('dialog', (dialog) => dialog.accept());

    // Clic en borrar
    await page.getByRole('button', { name: /Eliminar prestamo/i }).first().click();

    // La tabla debería quedar vacía
    await expect(page.getByText('No se encontraron prestamos registrados.')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Raqueta E2E Fullstack')).toBeHidden();
  });
});
