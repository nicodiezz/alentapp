import { test, expect } from '@playwright/test';

/**
 * Tests E2E Full-Stack para la vista de Certificados Médicos.
 * NO hay mocks de red. Playwright interactúa con:
 *   - El Frontend React en http://localhost:5173
 *   - La API Fastify real en http://localhost:3001
 *   - La base de datos PostgreSQL de test (alentapp_test_db)
 *
 * El global-setup se encarga de limpiar la DB antes de correr la suite,
 * por lo que cada test empieza desde un estado conocido y limpio.
 */

test.describe('Medical Certificates Full-Stack E2E', () => {

    test('debe mostrar el estado vacío cuando no hay certificados médicos en la DB', async ({ page }) => {
        await page.goto('/medical-certificates');
        await expect(page.getByText(/No se encontraron certificados medicos/i)).toBeVisible({ timeout: 10000 });
    });

    test('debe crear un certificado médico real y mostrarlo en la tabla', async ({ page }) => {
        await page.goto('/members');

        // Crear miembro real requerido para FK
        await page.getByRole('button', { name: /Agregar Miembro/i }).click();
        await expect(page.getByText(/Agregar Nuevo Miembro/i)).toBeVisible();

        await page.getByPlaceholder(/Juan Pérez/i).fill('Socio Medical Certificate E2E');
        await page.getByPlaceholder(/12345678/i).fill('99888777');
        await page.getByPlaceholder(/correo\.com/i).fill('medical-certificate-e2e@test.com');
        await page.getByLabel(/Fecha de Nacimiento/i).fill('1995-06-15');

        await page.getByRole('button', { name: /Crear Miembro/i }).click();
        await expect(page.getByText('Socio Medical Certificate E2E').first()).toBeVisible({ timeout: 10000 });

        // Ir a certificados médicos
        await page.goto('/medical-certificates');

        // Abrir modal
        await page.getByRole('button', { name: /Registrar Certificado Medico/i }).click();
        await expect(page.getByText(/Agregar Certificado Medico/i)).toBeVisible();

        // Completar formulario
        await page.getByLabel(/Fecha de Emision/i).fill('2026-01-01');
        await page.getByLabel(/Fecha de Vencimiento/i).fill('2026-12-31');
        await page.getByPlaceholder(/MP 12345/i).fill('MP-E2E-001');

        // Select Chakra custom
        await page.getByText(/Seleccione un miembro/i).click();
        await page.getByText('Socio Medical Certificate E2E').last().click();

        // Crear
        await page.getByRole('button', { name: /Crear Certificado/i }).click();

        await expect(page.getByText('MP-E2E-001')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('Socio Medical Certificate E2E').first()).toBeVisible();
    });

    test('debe editar el certificado médico creado y ver el cambio en la tabla', async ({ page }) => {
        // Crea el miembro
        await page.goto('/members');
        await page.getByRole('button', { name: /Agregar Miembro/i }).click();
        await expect(page.getByText(/Agregar Nuevo Miembro/i)).toBeVisible();
        await page.getByPlaceholder(/Juan Pérez/i).fill('Socio Edit E2E');
        await page.getByPlaceholder(/12345678/i).fill('77111222');
        await page.getByPlaceholder(/correo\.com/i).fill('edit-e2e@test.com');
        await page.getByLabel(/Fecha de Nacimiento/i).fill('1995-06-15');
        await page.getByRole('button', { name: /Crear Miembro/i }).click();
        await expect(page.getByText('Socio Edit E2E').first()).toBeVisible({ timeout: 10000 });

        // Crea el certificado
        await page.goto('/medical-certificates');
        await page.getByRole('button', { name: /Registrar Certificado Medico/i }).click();
        await expect(page.getByText(/Agregar Certificado Medico/i)).toBeVisible();
        await page.getByLabel(/Fecha de Emision/i).fill('2026-01-01');
        await page.getByLabel(/Fecha de Vencimiento/i).fill('2026-12-31');
        await page.getByPlaceholder(/MP 12345/i).fill('MP-EDIT-BASE');
        await page.getByText(/Seleccione un miembro/i).click();
        await page.getByText('Socio Edit E2E').last().click();
        await page.getByRole('button', { name: /Crear Certificado/i }).click();

        await expect(page.getByText('MP-E2E-001')).toBeVisible({ timeout: 10000 });

        // Edita el Certificado
        await page.getByRole('button', { name: /Editar certificado/i }).first().click();
        await expect(page.getByText(/Editar Certificado Medico/i)).toBeVisible();

        await page.getByPlaceholder(/MP 12345/i).fill('MP-E2E-EDITADO');

        await page.getByRole('button', { name: /Guardar Cambios/i }).click();
        await expect(page.getByRole('button', { name: /Guardar Cambios/i })).toBeHidden();

        // Verificar cambio en la tabla
        await expect(page.getByText('MP-E2E-EDITADO')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('MP-E2E-001', { exact: true })).toHaveCount(0);
    });

    test('debe invalidar el certificado anterior al crear uno nuevo para el mismo socio', async ({ page }) => {
        await page.goto('/medical-certificates');

        // Valida el certificado existente para que findActiveByMemberId lo encuentre como activo
        await page.getByRole('button', { name: /Editar certificado/i }).first().click();
        await expect(page.getByText(/Editar Certificado Medico/i)).toBeVisible();
        await page.locator('input[type="checkbox"]').check();
        await page.getByRole('button', { name: /Guardar Cambios/i }).click();
        await expect(page.getByRole('button', { name: /Guardar Cambios/i })).toBeHidden();
        await expect(page.getByText(/^Si$/).first()).toBeVisible({ timeout: 10000 });

        // Registra nuevo certificado
        await page.getByRole('button', { name: /Registrar Certificado Medico/i }).click();
        await expect(page.getByText(/Agregar Certificado Medico/i)).toBeVisible();

        await page.getByLabel(/Fecha de Emision/i).fill('2027-01-01');
        await page.getByLabel(/Fecha de Vencimiento/i).fill('2027-12-31');
        await page.getByPlaceholder(/MP 12345/i).fill('MP-E2E-NUEVO');

        await page.getByText(/Seleccione un miembro/i).click();
        await page.getByText('Socio Medical Certificate E2E').last().click();

        await page.getByRole('button', { name: /Crear Certificado/i }).click();

        await expect(page.getByText('MP-E2E-NUEVO')).toBeVisible({ timeout: 10000 });

        // El certificado anterior fue invalidado por el caso de uso al crear un nuevo certificado, ahora muestra "No"
        const rows = page.getByRole('row');
        const oldRow = rows.filter({ hasText: 'MP-E2E-EDITADO' });
        await expect(oldRow.getByText(/^No$/)).toBeVisible({ timeout: 10000 });
    });

    test('debe mostrar error si expiry_date es anterior a issue_date', async ({ page }) => {
        await page.goto('/medical-certificates');
        page.on('dialog', async (dialog) => { await dialog.accept();}); //si la app llega a abrir un alert o un confirm, lo acepta automaticamente para no dejar colgado al test, sino quizas nunca se ejecute

        await page.getByRole('button', { name: /Registrar Certificado Medico/i }).click();

        await page.getByLabel(/Fecha de Emision/i).fill('2026-12-31');
        await page.getByLabel(/Fecha de Vencimiento/i).fill('2026-01-01');
        await page.getByPlaceholder(/MP 12345/i).fill('MP-ERROR');

        await page.getByText(/Seleccione un miembro/i).click();
        await page.getByText('Socio Medical Certificate E2E').last().click();

        await page.getByRole('button', { name: /Crear Certificado/i }).click();

        await expect(page.getByText(/Agregar Certificado Medico/i)).toBeVisible({ timeout: 10000 });
    });

    test('debe eliminar el certificado médico y actualizar la tabla', async ({ page }) => {
        await page.goto('/medical-certificates');

        await expect(page.getByText('MP-E2E-NUEVO')).toBeVisible({ timeout: 10000 });

        // Aceptar el confirm del navegador automáticamente
        page.on('dialog', (dialog) => dialog.accept());

        // Click en borrar
        await page.getByRole('button', { name: /Eliminar certificado/i }).first().click();

        await expect(page.getByText('MP-E2E-NUEVO')).toHaveCount(0);
    });
});