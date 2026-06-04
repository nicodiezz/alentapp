import { test, expect } from '@playwright/test';
import pg from 'pg';
import crypto from 'crypto';

/**
 * Tests E2E Full-Stack para la vista de Casilleros.
 * NO hay ningún mock de red. Playwright interactúa con:
 *   - El Frontend React en http://localhost:5174
 *   - La API Fastify real en http://localhost:3001
 *   - La base de datos PostgreSQL de test (alentapp_test_db)
 *
 * Cada test limpia la tabla de casilleros antes de ejecutarse para asegurar la independencia.
 */

const DB_URL = 'postgresql://admin:password123@localhost:5433/alentapp_test_db';

const TEST_LOCKER_NUMBER = 99901;
const TEST_LOCKER_LOCATION = 'Vestuario Test E2E Fullstack';
const UPDATED_LOCATION = 'Vestuario Test E2E Fullstack Editado';

async function cleanLockersTable() {
    const client = new pg.Client({ connectionString: DB_URL });
    await client.connect();
    try {
        await client.query('TRUNCATE TABLE "lockers" RESTART IDENTITY CASCADE');
    } finally {
        await client.end();
    }
}

async function insertLocker(number: number, location: string) {
    const client = new pg.Client({ connectionString: DB_URL });
    await client.connect();
    try {
        await client.query(
            'INSERT INTO "lockers" (id, number, location, status) VALUES ($1, $2, $3, $4)',
            [crypto.randomUUID(), number, location, 'Available']
        );
    } finally {
        await client.end();
    }
}

test.describe('Lockers Full-Stack E2E', () => {

    test.beforeEach(async () => {
        await cleanLockersTable();
    });

    test.afterEach(async () => {
        await cleanLockersTable();
    });

    test('debe mostrar el estado vacío cuando no hay casilleros en la DB', async ({ page }) => {
        await page.goto('/lockers');
        await expect(page.getByText('No se encontraron casilleros.')).toBeVisible({ timeout: 10000 });
    });

    test('debe crear un casillero real y mostrarlo en la tabla', async ({ page }) => {
        await page.goto('/lockers');

        // Abrir modal de creación
        await page.getByRole('button', { name: /Agregar Casillero/i }).click();
        await expect(page.getByText('Agregar Nuevo Casillero')).toBeVisible();

        // Llenar formulario con datos reales
        await page.getByLabel('Número', { exact: false }).fill(String(TEST_LOCKER_NUMBER));
        await page.getByPlaceholder('Ej. Vestuario A').fill(TEST_LOCKER_LOCATION);

        // Guardar
        await page.getByRole('button', { name: 'Crear Casillero' }).click();

        // Esperar que el modal se cierre y el casillero aparezca en la tabla real
        await expect(page.getByRole('button', { name: 'Crear Casillero' })).toBeHidden();
        await expect(page.getByText(TEST_LOCKER_LOCATION)).toBeVisible({ timeout: 10000 });
        await expect(page.getByText(String(TEST_LOCKER_NUMBER))).toBeVisible();
        await expect(page.getByText('Disponible', { exact: true })).toBeVisible();
    });

    test('debe editar el casillero creado y ver el cambio en la tabla', async ({ page }) => {
        // Insertar el casillero para que este test no dependa de que el anterior lo cree
        await insertLocker(TEST_LOCKER_NUMBER, TEST_LOCKER_LOCATION);

        await page.goto('/lockers');

        // Esperar que el casillero esté en la tabla
        await expect(page.getByText(TEST_LOCKER_LOCATION)).toBeVisible({ timeout: 10000 });

        // Clic en Editar
        await page.getByRole('button', { name: /Editar/i }).first().click();
        await expect(page.getByText('Editar Casillero')).toBeVisible();

        // Cambiar ubicación
        await page.getByPlaceholder('Ej. Vestuario A').fill(UPDATED_LOCATION);

        // Guardar
        await page.getByRole('button', { name: 'Guardar Cambios' }).click();
        await expect(page.getByRole('button', { name: 'Guardar Cambios' })).toBeHidden();

        // Verificar cambio en la tabla
        await expect(page.getByText(UPDATED_LOCATION)).toBeVisible({ timeout: 10000 });
        await expect(page.getByText(TEST_LOCKER_LOCATION, { exact: true })).toBeHidden();
    });

    test('debe eliminar el casillero y mostrar el estado vacío', async ({ page }) => {
        // Insertar el casillero para que este test no dependa de que el anterior lo cree o mantenga
        await insertLocker(TEST_LOCKER_NUMBER, TEST_LOCKER_LOCATION);

        await page.goto('/lockers');

        // El casillero debería estar en la tabla
        await expect(page.getByText(TEST_LOCKER_LOCATION)).toBeVisible({ timeout: 10000 });

        // Aceptar el confirm del navegador automáticamente
        page.on('dialog', (dialog) => dialog.accept());

        // Clic en borrar
        await page.getByRole('button', { name: /Eliminar/i }).first().click();

        // La tabla debería quedar vacía
        await expect(page.getByText('No se encontraron casilleros.')).toBeVisible({ timeout: 10000 });
    });
});
