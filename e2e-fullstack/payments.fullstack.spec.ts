import { test, expect } from '@playwright/test';

test.describe('Payments Full-Stack E2E', () => {

    test('debe mostrar el estado vacío cuando no hay pagos en la DB', async ({ page }) => {
        await page.goto('/payments');
        await expect(page.getByText('No se encontraron pagos.')).toBeVisible({ timeout: 10000 });
    });

    test('debe crear un miembro y un pago real y mostrarlo en la tabla', async ({ page }) => {

        await page.goto('/members');

        await page.getByRole('button', { name: /Agregar Miembro/i }).click();
        await expect(page.getByText(/Agregar Nuevo Miembro/i)).toBeVisible();

        await page.getByPlaceholder(/Juan Pérez/i).fill('Juan Pérez');
        await page.getByPlaceholder(/12345678/i).fill('11223344');
        await page.getByPlaceholder(/correo\.com/i).fill('juanperez@gmail.com');
        await page.getByLabel(/Fecha de Nacimiento/i).fill('1990-03-20');

        await page.getByRole('button', { name: /Crear Miembro/i }).click();
        await expect(page.getByText('Juan Pérez').first()).toBeVisible({ timeout: 10000 });

        await page.goto('/payments');

        await page.getByRole('button', { name: /Agregar Pago/i }).click();
        await expect(page.getByText('Agregar Nuevo Pago')).toBeVisible();

        await page.getByText(/Seleccione un miembro/i).click();
        await page.getByText('Juan Pérez').last().click();

        await page.getByPlaceholder('Ej. 5000').fill('3500');
        await page.getByPlaceholder('Ej. 5', { exact: true }).fill('6');
        await page.getByPlaceholder('Ej. 2026').fill('2026');
        await page.getByLabel(/Fecha de Vencimiento/i).fill('2026-12-31');


        await page.getByRole('button', { name: 'Crear Pago' }).click();

        await expect(page.getByRole('button', { name: 'Crear Pago' })).toBeHidden();
        await expect(page.getByText('Juan Pérez')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('$3500')).toBeVisible();
        await expect(page.getByRole('cell', { name: '6', exact: true })).toBeVisible();
        await expect(page.getByRole('cell', { name: '2026', exact: true })).toBeVisible();
        await expect(page.getByText('Pendiente')).toBeVisible();
    });

    test('debe editar el pago creado y ver el cambio en la tabla', async ({ page }) => {
        await page.goto('/payments');

        await expect(page.getByText('Juan Pérez')).toBeVisible({ timeout: 10000 });

        await page.getByRole('button', { name: /Editar pago/i }).first().click();
        await expect(page.getByText('Editar Pago')).toBeVisible();

        await page.getByPlaceholder('Ej. 5000').fill('4200');

        await page.getByRole('combobox', { name: 'Estado' }).click();
        await page.getByText('Pagado', { exact: true }).last().click();

        await page.getByLabel(/Fecha de Pago/i).fill('2026-06-30');

        await page.getByRole('button', { name: 'Guardar Cambios' }).click();
        await expect(page.getByRole('button', { name: 'Guardar Cambios' })).toBeHidden();

        await expect(page.getByText('$4200')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('$3500')).toBeHidden();
    });

    test('debe cancelar el pago y mostrar el estado Cancelado en la tabla', async ({ page }) => {
        page.on('dialog', (dialog) => {
            expect(dialog.type()).toBe('confirm');
            expect(dialog.message()).toContain('¿Estás seguro de que deseas cancelar este pago?');
            dialog.accept();
        });

        await page.goto('/payments');

        await expect(page.getByText('Juan Pérez')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('$4200')).toBeVisible();

        await page.getByRole('button', { name: /^Cancelar$/i }).first().click();

        await expect(page.getByText('Cancelado')).toBeVisible({ timeout: 10000 });

        await expect(page.getByRole('button', { name: /^Cancelar$/i })).toBeHidden();
    });
});
