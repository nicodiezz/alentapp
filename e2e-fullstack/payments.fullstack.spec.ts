import { test, expect } from '@playwright/test';
import pg from 'pg';
import crypto from 'crypto';

const DB_URL = 'postgresql://admin:password123@localhost:5433/alentapp_test_db';
const TEST_MEMBER_NAME = 'Miembro Test Payment E2E';

async function cleanPaymentsTable() {
  const client = new pg.Client({ connectionString: DB_URL });
  await client.connect();
  try {
    await client.query('TRUNCATE TABLE "payments" RESTART IDENTITY CASCADE');
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
      [id, TEST_MEMBER_NAME, `PAY${randomSuffix}`, `pay${randomSuffix}@e2e.com`, new Date('1990-03-20'), 'Pleno']
    );
    return id;
  } finally {
    await client.end();
  }
}

async function insertPayment(
  memberId: string,
  amount: number,
  month: number,
  year: number,
  status: 'Pending' | 'Paid' | 'Canceled',
  dueDate: Date,
  paymentDate: Date | null = null
): Promise<string> {
  const client = new pg.Client({ connectionString: DB_URL });
  await client.connect();
  try {
    const id = crypto.randomUUID();
    await client.query(
      'INSERT INTO "payments" (id, member_id, amount, month, year, status, due_date, payment_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [id, memberId, amount, month, year, status, dueDate, paymentDate]
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
    await client.query('TRUNCATE TABLE "payments" RESTART IDENTITY CASCADE');
    await client.query('DELETE FROM "members" WHERE name = $1', [TEST_MEMBER_NAME]);
  } finally {
    await client.end();
  }
}

test.describe('Payments Full-Stack E2E', () => {
    let testMemberId: string;

    test.beforeEach(async () => {
        await cleanPaymentsTable();
        testMemberId = await insertMember();
    });

    test.afterEach(async () => {
        await cleanupTestData();
    });

    test('debe mostrar el estado vacío cuando no hay pagos en la DB', async ({ page }) => {
        await page.goto('/payments');
        await expect(page.getByText('No se encontraron pagos.')).toBeVisible({ timeout: 10000 });
    });

    test('debe crear un pago real y mostrarlo en la tabla', async ({ page }) => {
        await page.goto('/payments');

        await page.getByRole('button', { name: /Agregar Pago/i }).click();
        await expect(page.getByText('Agregar Nuevo Pago')).toBeVisible();

        await page.getByText(/Seleccione un miembro/i).click();
        await page.getByText(TEST_MEMBER_NAME).last().click();

        await page.getByPlaceholder('Ej. 5000').fill('3500');
        await page.getByPlaceholder('Ej. 5', { exact: true }).fill('6');
        await page.getByPlaceholder('Ej. 2026').fill('2026');
        await page.getByLabel(/Fecha de Vencimiento/i).fill('2026-12-31');

        await page.getByRole('button', { name: 'Crear Pago' }).click();

        await expect(page.getByRole('button', { name: 'Crear Pago' })).toBeHidden();
        await expect(page.getByText(TEST_MEMBER_NAME)).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('$3500')).toBeVisible();
        await expect(page.getByRole('cell', { name: '6', exact: true })).toBeVisible();
        await expect(page.getByRole('cell', { name: '2026', exact: true })).toBeVisible();
        await expect(page.getByText('Pendiente')).toBeVisible();
    });

    test('debe editar el pago creado y ver el cambio en la tabla', async ({ page }) => {
        await insertPayment(testMemberId, 3500, 6, 2026, 'Pending', new Date('2026-12-31'));

        await page.goto('/payments');

        await expect(page.getByText(TEST_MEMBER_NAME)).toBeVisible({ timeout: 10000 });

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
        await insertPayment(testMemberId, 4200, 6, 2026, 'Paid', new Date('2026-12-31'), new Date('2026-06-30'));

        page.on('dialog', (dialog) => {
            expect(dialog.type()).toBe('confirm');
            expect(dialog.message()).toContain('¿Estás seguro de que deseas cancelar este pago?');
            dialog.accept();
        });

        await page.goto('/payments');

        await expect(page.getByText(TEST_MEMBER_NAME)).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('$4200')).toBeVisible();

        await page.getByRole('button', { name: /^Cancelar$/i }).first().click();

        await expect(page.getByText('Cancelado')).toBeVisible({ timeout: 10000 });

        await expect(page.getByRole('button', { name: /^Cancelar$/i })).toBeHidden();
    });
});
