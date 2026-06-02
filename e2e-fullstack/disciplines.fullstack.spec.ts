import { test, expect } from '@playwright/test';
import pg from 'pg';
import crypto from 'crypto';

/**
 * Tests E2E Full-Stack para la vista de Sanciones Disciplinarias.
 * NO hay ningún mock de red. Playwright interactúa con:
 *   - El Frontend React en http://localhost:5174
 *   - La API Fastify real en http://localhost:3001
 *   - La base de datos PostgreSQL de test (alentapp_test_db)
 *
 * Cada test limpia la tabla de sanciones antes de ejecutarse para asegurar la independencia.
 * Los tests que necesitan datos previos los insertan directamente en la DB.
 */

const DB_URL = 'postgresql://admin:password123@localhost:5433/alentapp_test_db';
const TEST_MEMBER_NAME = 'Miembro Test Discipline E2E';
const TEST_REASON = 'Sanción E2E Fullstack';

async function cleanDisciplinesTable() {
  const client = new pg.Client({ connectionString: DB_URL });
  await client.connect();
  try {
    await client.query('TRUNCATE TABLE "disciplines" RESTART IDENTITY CASCADE');
  } finally {
    await client.end();
  }
}

async function insertMember(): Promise<string> {
  const client = new pg.Client({ connectionString: DB_URL });
  await client.connect();
  try {
    const id = crypto.randomUUID();
    const randomSuffix = crypto.randomBytes(4).toString('hex');
    await client.query(
      'INSERT INTO "members" (id, name, dni, email, birthdate, category) VALUES ($1, $2, $3, $4, $5, $6)',
      [id, TEST_MEMBER_NAME, `DISC${randomSuffix}`, `disc${randomSuffix}@e2e.com`, new Date('1995-06-15'), 'Pleno']
    );
    return id;
  } finally {
    await client.end();
  }
}

async function insertDiscipline(memberId: string, reason: string): Promise<string> {
  const client = new pg.Client({ connectionString: DB_URL });
  await client.connect();
  try {
    const id = crypto.randomUUID();
    await client.query(
      'INSERT INTO "disciplines" (id, reason, issue_date, expiry_date, is_total_suspension, member_id) VALUES ($1, $2, $3, $4, $5, $6)',
      [id, reason, new Date('2026-06-01'), new Date('2026-08-01'), false, memberId]
    );
    return id;
  } finally {
    await client.end();
  }
}

async function cleanupTestData() {
  const client = new pg.Client({ connectionString: DB_URL });
  await client.connect();
  try {
    await client.query('TRUNCATE TABLE "disciplines" RESTART IDENTITY CASCADE');
    await client.query('DELETE FROM "members" WHERE name = $1', [TEST_MEMBER_NAME]);
  } finally {
    await client.end();
  }
}

test.describe('Disciplines Full-Stack E2E', () => {
  let testMemberId: string;

  test.beforeEach(async () => {
    await cleanDisciplinesTable();
    testMemberId = await insertMember();
  });

  test.afterAll(async () => {
    await cleanupTestData();
  });

  test('debe mostrar el estado vacío cuando no hay sanciones en la DB', async ({ page }) => {
    await page.goto('/disciplines');
    await expect(page.getByText('No se encontraron sanciones registradas.')).toBeVisible({ timeout: 10000 });
  });

  test('debe crear una sanción real y mostrarla en la tabla', async ({ page }) => {
    await page.goto('/disciplines');

    await page.getByRole('button', { name: /Nueva suspensión/i }).click();
    await expect(page.getByText('Nueva suspensión Disciplinaria')).toBeVisible();

    await page.locator('[data-part="trigger"]').click();
    await page.locator('[data-part="item"]').first().click();

    await page.getByPlaceholder('Ej. Conducta indebida en partido').fill(TEST_REASON);
    await page.getByLabel(/Fecha de inicio/i).fill('2026-06-01');
    await page.getByLabel(/Fecha de vencimiento/i).fill('2026-08-01');

    await page.getByRole('button', { name: 'Crear suspensión' }).click();

    await expect(page.getByRole('button', { name: 'Crear suspensión' })).toBeHidden();
    await expect(page.getByText(TEST_REASON)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(TEST_MEMBER_NAME)).toBeVisible();
  });

  test('debe editar la sanción creada y ver el cambio en la tabla', async ({ page }) => {
    await insertDiscipline(testMemberId, TEST_REASON);

    await page.goto('/disciplines');

    await expect(page.getByText(TEST_REASON)).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: /Editar suspensión/i }).first().click();
    await expect(page.getByText('Editar suspensión Disciplinaria')).toBeVisible();

    await page.getByPlaceholder('Ej. Conducta indebida en partido').fill(`${TEST_REASON} Editada`);

    await page.getByRole('button', { name: 'Guardar Cambios' }).click();
    await expect(page.getByRole('button', { name: 'Guardar Cambios' })).toBeHidden();

    await expect(page.getByText(`${TEST_REASON} Editada`)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(TEST_REASON, { exact: true })).toBeHidden();
  });

  test('debe eliminar la sanción y mostrar el estado vacío', async ({ page }) => {
    await insertDiscipline(testMemberId, TEST_REASON);

    await page.goto('/disciplines');

    await expect(page.getByText(TEST_REASON)).toBeVisible({ timeout: 10000 });

    page.on('dialog', (dialog) => dialog.accept());

    await page.getByRole('button', { name: /Eliminar suspensión/i }).first().click();

    await expect(page.getByText('No se encontraron sanciones registradas.')).toBeVisible({ timeout: 10000 });
  });
});
