import { test, expect } from '@playwright/test';
import type { EquipmentLoanDTO, MemberDTO } from '@alentapp/shared';

test.describe('EquipmentLoans E2E (UI Integration)', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));

    // Estado en memoria simulando la Base de Datos para estos tests
    const mockMembers: MemberDTO[] = [
      {
        id: 'member-pleno-1',
        dni: '12345678',
        name: 'Socio Pleno Playwright',
        email: 'pleno@playwright.dev',
        birthdate: '1990-01-01',
        category: 'Pleno',
        status: 'Activo',
        created_at: new Date().toISOString(),
      },
    ];

    const mockLoans: EquipmentLoanDTO[] = [
      {
        id: '1',
        item_name: 'Raqueta de tenis',
        status: 'Loaned',
        loan_date: '2026-05-01',
        due_date: '2026-05-15',
        member_id: 'member-pleno-1',
      },
    ];

    // Interceptamos las llamadas a socios (la vista de préstamos necesita la lista de socios
    // para resolver nombres y poblar el select del modal)
    await page.route(/\/api\/v1\/socios/, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: mockMembers }),
        });
      } else if (route.request().method() === 'OPTIONS') {
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

    // Interceptamos todas las llamadas de red hacia el endpoint de préstamos.
    // De este modo, nuestros tests E2E del frontend son resilientes y no dependen
    // de que la base de datos de PostgreSQL esté levantada.
    await page.route(/\/api\/v1\/equipment-loans/, async (route) => {
      const method = route.request().method();

      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: mockLoans }),
        });
      } else if (method === 'POST') {
        const payload = route.request().postDataJSON();
        const newLoan: EquipmentLoanDTO = {
          id: String(mockLoans.length + 1),
          status: 'Loaned', // TDD 0019: estado por defecto
          ...payload,
        };
        // Insertamos en nuestra BD falsa para que el próximo GET lo traiga
        mockLoans.push(newLoan);

        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ data: newLoan }),
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
        const index = mockLoans.findIndex(l => String(l.id) === String(id));

        console.log('PUT payload', payload, 'found index', index);

        if (index > -1) {
          mockLoans[index] = { ...mockLoans[index], ...payload };
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: mockLoans[index] }),
          });
        } else {
          await route.fulfill({ status: 404, body: JSON.stringify({ error: 'El préstamo no existe' }) });
        }
      } else if (method === 'DELETE') {
        const urlObj = new URL(route.request().url());
        const id = urlObj.pathname.split('/').pop();
        const index = mockLoans.findIndex(l => String(l.id) === String(id));
        console.log('DELETE id', id, 'found index', index);
        if (index > -1) {
          mockLoans.splice(index, 1);
        }

        await route.fulfill({ status: 204 });
      } else {
        await route.continue();
      }
    });

    // Navegamos directamente a la vista de préstamos
    await page.goto('/equipment-loans');
  });

  test('debe mostrar la lista de préstamos cargada desde el network interceptado', async ({ page }) => {
    // Verificamos que nuestro dato simulado esté pintado en la tabla HTML real
    await expect(page.getByText('Raqueta de tenis')).toBeVisible();
    await expect(page.getByText('Socio Pleno Playwright')).toBeVisible();
    await expect(page.getByText('Prestado')).toBeVisible();
  });

  test('debe abrir el modal de creación y enviar el formulario de red', async ({ page }) => {
    // Buscar y clickear en "Nuevo prestamo"
    await page.locator('button:has-text("Nuevo prestamo")').click();

    // Verificamos que el modal se abrió
    await expect(page.getByText('Nuevo prestamo de equipamiento')).toBeVisible();

    // Seleccionar el socio Pleno
    await page.locator('button:has-text("Seleccione un socio")').click();
    await page.getByText('Socio Pleno Playwright').click();

    // Llenar el formulario simulando tipeo real de usuario
    await page.getByPlaceholder('Ej. Pelota de futbol').fill('Pelota Nueva E2E');
    await page.locator('input[type="date"]').first().fill('2026-06-01');
    await page.locator('input[type="date"]').nth(1).fill('2026-06-15');

    // Clic en enviar (TDD 0019: status por defecto Loaned, sin select en creación)
    await page.getByRole('button', { name: 'Crear prestamo' }).click();

    // Verificamos que el modal se cerró con éxito
    await expect(page.getByRole('button', { name: 'Crear prestamo' })).toBeHidden();

    // Verificamos que el componente hizo refresh (GET) y muestra el nuevo préstamo en la tabla
    await expect(page.getByText('Pelota Nueva E2E')).toBeVisible();
  });

  test('debe abrir el modal de edición, actualizar el estado y mostrar el cambio', async ({ page }) => {
    // Asegurarnos que el préstamo está en la tabla antes de editar
    await expect(page.getByText('Raqueta de tenis')).toBeVisible();

    // Buscar y clickear en el botón de edición
    await page.getByRole('button', { name: /Editar prestamo/i }).click();

    // Verificamos que el modal se abrió con el título correcto
    await expect(page.getByText('Editar prestamo de equipamiento')).toBeVisible();

    // Cambiar el estado a Devuelto (TDD 0020: estados permitidos Loaned/Returned/Damaged)
    await page.locator('button:has-text("Prestado")').click();
    await page.getByText('Devuelto', { exact: true }).click();

    // Clic en guardar
    await page.getByRole('button', { name: 'Guardar Cambios' }).click();

    // Esperar que se cierre
    await expect(page.getByRole('button', { name: 'Guardar Cambios' })).toBeHidden();

    // Verificar en la tabla
    await expect(page.getByText('Devuelto')).toBeVisible();
  });

  test('debe poder eliminar un préstamo tras aceptar la alerta de confirmación', async ({ page }) => {
    // Escuchar el evento del dialog "confirm" del navegador y aceptarlo automáticamente
    // (TDD 0021: confirmación explícita antes de borrar)
    page.on('dialog', dialog => dialog.accept());

    // Asegurarnos que el préstamo está en la tabla antes de borrar
    await expect(page.getByText('Raqueta de tenis')).toBeVisible();

    // Clic en borrar
    await page.getByRole('button', { name: /Eliminar prestamo/i }).click();

    // Verificar que la tabla se actualice y muestre el empty state
    await expect(page.getByText('No se encontraron prestamos registrados.')).toBeVisible();
    await expect(page.getByText('Raqueta de tenis')).toBeHidden();
  });
});
