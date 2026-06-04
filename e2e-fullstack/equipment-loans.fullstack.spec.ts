import { test, expect } from '@playwright/test';
import pg from 'pg';
import crypto from 'crypto';

const DB_URL = 'postgresql://admin:password123@localhost:5433/alentapp_test_db';
const TEST_MEMBER_NAME = 'Miembro Test EquipmentLoan E2E';
const TEST_CADETE_NAME = 'Cadete Test EquipmentLoan E2E';

async function cleanEquipmentLoansTable() {
    const client = new pg.Client({ connectionString: DB_URL });
    await client.connect();
    try {
        await client.query('TRUNCATE TABLE "equipment_loans" RESTART IDENTITY CASCADE');
    } finally {
        await client.end();
    }
}

async function insertMember(
    name: string,
    category: 'Pleno' | 'Cadete' | 'Honorario' = 'Pleno',
): Promise<string> {
    const client = new pg.Client({ connectionString: DB_URL });
    await client.connect();
    try {
        const id = crypto.randomUUID();
        const randomSuffix = crypto.randomBytes(4).toString('hex');
        const birthdate = category === 'Cadete' ? new Date('2015-01-01') : new Date('1990-03-20');
        await client.query(
            'INSERT INTO "members" (id, name, dni, email, birthdate, category) VALUES ($1, $2, $3, $4, $5, $6)',
            [id, name, `EQL${randomSuffix}`, `eql${randomSuffix}@e2e.com`, birthdate, category],
        );
        return id;
    } finally {
        await client.end();
    }
}

async function insertEquipmentLoan(
    memberId: string,
    itemName: string,
    status: 'Loaned' | 'Returned' | 'Damaged',
    loanDate: Date,
    dueDate: Date,
): Promise<string> {
    const client = new pg.Client({ connectionString: DB_URL });
    await client.connect();
    try {
        const id = crypto.randomUUID();
        await client.query(
            'INSERT INTO "equipment_loans" (id, member_id, item_name, status, loan_date, due_date) VALUES ($1, $2, $3, $4, $5, $6)',
            [id, memberId, itemName, status, loanDate, dueDate],
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
        await client.query('TRUNCATE TABLE "equipment_loans" RESTART IDENTITY CASCADE');
        await client.query('DELETE FROM "members" WHERE name = ANY($1::text[])', [
            [TEST_MEMBER_NAME, TEST_CADETE_NAME],
        ]);
    } finally {
        await client.end();
    }
}

test.describe('EquipmentLoans Full-Stack E2E', () => {
    let testMemberId: string;

    test.beforeEach(async () => {
        await cleanEquipmentLoansTable();
        testMemberId = await insertMember(TEST_MEMBER_NAME, 'Pleno');
    });

    test.afterEach(async () => {
        await cleanupTestData();
    });

    test('debe mostrar el estado vacío cuando no hay préstamos en la DB', async ({ page }) => {
        await page.goto('/equipment-loans');
        await expect(page.getByText('No se encontraron prestamos registrados.')).toBeVisible({ timeout: 10000 });
    });

    test('debe crear un préstamo real con estado Loaned por defecto y mostrarlo en la tabla', async ({ page }) => {
        await page.goto('/equipment-loans');

        // Abrir modal de creación
        await page.getByRole('button', { name: /Nuevo prestamo/i }).click();
        await expect(page.getByText('Nuevo prestamo de equipamiento')).toBeVisible();

        // Seleccionar el socio Pleno insertado en el beforeEach
        await page.getByText(/Seleccione un socio/i).click();
        await page.getByText(TEST_MEMBER_NAME).last().click();

        // Llenar el resto del formulario
        await page.getByPlaceholder('Ej. Pelota de futbol').fill('Raqueta E2E Fullstack');
        await page.locator('input[type="date"]').first().fill('2026-05-01');
        await page.locator('input[type="date"]').nth(1).fill('2026-05-15');

        // Crear (TDD 0019: status por defecto "Loaned" — el modal de creación no expone el campo)
        await page.getByRole('button', { name: 'Crear prestamo' }).click();

        await expect(page.getByRole('button', { name: 'Crear prestamo' })).toBeHidden();
        await expect(page.getByText('Raqueta E2E Fullstack')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText(TEST_MEMBER_NAME)).toBeVisible();
        await expect(page.getByText('Prestado')).toBeVisible();
    });

    test('debe editar el préstamo creado cambiando su estado a Devuelto', async ({ page }) => {
        await insertEquipmentLoan(
            testMemberId,
            'Raqueta E2E Edit',
            'Loaned',
            new Date('2026-05-01'),
            new Date('2026-05-15'),
        );

        await page.goto('/equipment-loans');

        await expect(page.getByText('Raqueta E2E Edit')).toBeVisible({ timeout: 10000 });

        // Clic en Editar
        const rows = page.getByRole('row');
        const targetRow = rows.filter({ hasText: 'Raqueta E2E Edit' });
        await targetRow.getByRole('button', { name: /Editar prestamo/i }).click();
        await expect(page.getByText('Editar prestamo de equipamiento')).toBeVisible();

        // Cambiar el estado a Devuelto (TDD 0020: estados permitidos Loaned/Returned/Damaged)
        await page.getByRole('button', { name: /Prestado/i }).click();
        await page.getByText('Devuelto', { exact: true }).last().click();

        await page.getByRole('button', { name: 'Guardar Cambios' }).click();
        await expect(page.getByRole('button', { name: 'Guardar Cambios' })).toBeHidden();

        await expect(page.getByText('Devuelto')).toBeVisible({ timeout: 10000 });
    });

    test('debe eliminar el préstamo y mostrar el estado vacío (tras aceptar confirm)', async ({ page }) => {
        await insertEquipmentLoan(
            testMemberId,
            'Raqueta E2E Delete',
            'Loaned',
            new Date('2026-05-01'),
            new Date('2026-05-15'),
        );

        // Aceptar el confirm del navegador automáticamente (TDD 0021)
        page.on('dialog', (dialog) => {
            expect(dialog.type()).toBe('confirm');
            dialog.accept();
        });

        await page.goto('/equipment-loans');

        await expect(page.getByText('Raqueta E2E Delete')).toBeVisible({ timeout: 10000 });

        const rows = page.getByRole('row');
        const targetRow = rows.filter({ hasText: 'Raqueta E2E Delete' });
        await targetRow.getByRole('button', { name: /Eliminar prestamo/i }).click();

        await expect(page.getByText('No se encontraron prestamos registrados.')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('Raqueta E2E Delete')).toHaveCount(0);
    });

    test('debe mostrar error si la categoría del socio no le permite tomar préstamos', async ({ page }) => {
        // Insertamos un socio Cadete (categoría no permitida por el TDD 0019)
        await insertMember(TEST_CADETE_NAME, 'Cadete');

        await page.goto('/equipment-loans');

        // Si la app abre un alert/confirm con el error, lo aceptamos para no dejar colgado al test
        page.on('dialog', async (dialog) => { await dialog.accept(); });

        await page.getByRole('button', { name: /Nuevo prestamo/i }).click();
        await expect(page.getByText('Nuevo prestamo de equipamiento')).toBeVisible();

        await page.getByText(/Seleccione un socio/i).click();
        await page.getByText(TEST_CADETE_NAME).last().click();

        await page.getByPlaceholder('Ej. Pelota de futbol').fill('Raqueta Cadete');
        await page.locator('input[type="date"]').first().fill('2026-05-01');
        await page.locator('input[type="date"]').nth(1).fill('2026-05-15');

        await page.getByRole('button', { name: 'Crear prestamo' }).click();

        // El backend rechaza la creación: el modal sigue abierto y el préstamo nunca aparece en la tabla
        await expect(page.getByText('Nuevo prestamo de equipamiento')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('Raqueta Cadete')).toHaveCount(0);
    });
});
