import { test, expect } from '@playwright/test';
import pg from 'pg';
import crypto from 'crypto';

/**
 * Tests E2E Full-Stack para la vista de Deportes.
 * NO hay ningún mock de red. Playwright interactúa con:
 *   - El Frontend React en http://localhost:5174
 *   - La API Fastify real en http://localhost:3001
 *   - La base de datos PostgreSQL de test (alentapp_test_db)
 *
 * Cada test limpia la tabla de deportes antes de ejecutarse para asegurar la independencia.
 */

const DB_URL = 'postgresql://admin:password123@localhost:5433/alentapp_test_db';

async function cleanSportsTable() {
  const client = new pg.Client({ connectionString: DB_URL });
  await client.connect();
  try {
    await client.query('TRUNCATE TABLE "sports" RESTART IDENTITY CASCADE');
  } finally {
    await client.end();
  }
}

async function insertSport(name: string, description: string, capacity: number, price: number) {
  const client = new pg.Client({ connectionString: DB_URL });
  await client.connect();
  try {
    await client.query(
      'INSERT INTO "sports" (id, name, description, max_capacity, additional_price, requires_medical_certificate) VALUES ($1, $2, $3, $4, $5, $6)',
      [
        crypto.randomUUID(),
        name,
        description,
        capacity,
        price,
        false
      ]
    );
  } finally {
    await client.end();
  }
}

test.describe('Sports Full-Stack E2E', () => {

  test.beforeEach(async () => {
    await cleanSportsTable();
  });

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
    // Insertar el deporte para que este test no dependa de que el anterior lo cree
    await insertSport('Test E2E Fullstack Sport', 'Deporte creado por test e2e fullstack', 24, 1800);

    await page.goto('/sports');

    // Esperar que el deporte esté en la tabla
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
    // Insertar el deporte para que este test no dependa de que el anterior lo cree o mantenga
    await insertSport('Test E2E Fullstack Sport', 'Deporte creado por test e2e fullstack', 24, 1800);

    await page.goto('/sports');

    // El deporte debería estar en la tabla
    await expect(page.getByText('Test E2E Fullstack Sport')).toBeVisible({ timeout: 10000 });

    // Aceptar el confirm del navegador automáticamente
    page.on('dialog', (dialog) => dialog.accept());

    // Clic en borrar
    await page.getByRole('button', { name: /Eliminar deporte/i }).first().click();

    // La tabla debería quedar vacía
    await expect(page.getByText('No se encontraron deportes.')).toBeVisible({ timeout: 10000 });
  });
});
