import { describe, it, expect } from 'vitest';
import { PaymentValidator } from './PaymentValidator.js';
import { PaymentStatus, CreatePaymentStatus } from '@alentapp/shared';

describe('PaymentValidator', () => {
    const validator = new PaymentValidator();

    describe('validateAmount', () => {
        it('debe pasar con un monto válido', () => {
            expect(() => validator.validateAmount(2500)).not.toThrow();
        });
        it('debe fallar si no es un número', () => {
            expect(() => validator.validateAmount('100' as any)).toThrow('Monto inválido');
        });
        it('debe fallar si es menor o igual a cero', () => {
            expect(() => validator.validateAmount(0)).toThrow('El monto debe ser mayor a cero');
        });
    });


    describe('validateStatus', () => {
        it('debe pasar con un estado válido', () => {
            expect(() => validator.validateStatus('Paid')).not.toThrow();
            expect(() => validator.validateStatus('Pending')).not.toThrow();
        });
        it('debe fallar con un estado inválido', () => {
            expect(() => validator.validateStatus('Canceled' as CreatePaymentStatus)).toThrow('El estado debe ser "Pendiente" o "Pagado"');
        });
    });

    describe('validateMonth', () => {
        it('debe pasar con un mes válido (1-12)', () => {
            expect(() => validator.validateMonth(1)).not.toThrow();
            expect(() => validator.validateMonth(12)).not.toThrow();
        });
        it('debe fallar si el mes está fuera de rango', () => {
            expect(() => validator.validateMonth(0)).toThrow('El mes debe estar entre 1 y 12');
            expect(() => validator.validateMonth(13)).toThrow('El mes debe estar entre 1 y 12');
        });
        it('debe fallar si no es un número', () => {
            expect(() => validator.validateMonth('5' as any)).toThrow('El mes debe ser un número');
        });
    });

    describe('validateYear', () => {
        const currentYear = new Date().getFullYear();
        it('debe pasar con el año actual', () => {
            expect(() => validator.validateYear(currentYear)).not.toThrow();
        });
        it('debe pasar con un año futuro', () => {
            expect(() => validator.validateYear(currentYear + 1)).not.toThrow();
        });
        it('debe fallar si el año es menor al actual', () => {
            expect(() => validator.validateYear(currentYear - 1)).toThrow('El año debe ser mayor o igual al año actual');
        });
        it('debe fallar si no es un número', () => {
            expect(() => validator.validateYear('2026' as any)).toThrow('El año debe ser un número');
        });
    });

    describe('validateDueDate', () => {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        it('debe pasar con fecha futura', () => {
            expect(() => validator.validateDueDate(tomorrow.toISOString())).not.toThrow();
        });
        it('debe pasar con fecha actual', () => {
            expect(() => validator.validateDueDate(today.toISOString())).not.toThrow();
        });
        it('debe fallar con fecha pasada', () => {
            expect(() => validator.validateDueDate(yesterday.toISOString())).toThrow('La fecha de vencimiento debe ser mayor o igual a la fecha actual');
        });
        it('debe fallar con fecha inválida', () => {
            expect(() => validator.validateDueDate('invalid')).toThrow('Fecha de vencimiento inválida');
        });
    });

    describe('validatePaymentDate', () => {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        it('debe fallar si es vacío cuando el estado es "Paid"', () => {
            expect(() => validator.validatePaymentDate('', 'Paid')).toThrow('La fecha de pago es obligatoria si el estado es Pagado');
        });

        it('debe fallar si es fecha pasada cuando el estado es "Paid"', () => {
            expect(() => validator.validatePaymentDate(yesterday.toISOString(), 'Paid')).toThrow('La fecha de pago debe ser mayor o igual a la fecha actual');
        });

        it('debe pasar con fecha actual cuando el estado es "Paid"', () => {
            expect(() => validator.validatePaymentDate(today.toISOString(), 'Paid')).not.toThrow();
        });

        it('debe pasar si es vacío cuando el estado no es "Paid"', () => {
            expect(() => validator.validatePaymentDate('', 'Pending')).not.toThrow();
        });

        it('debe fallar con fecha inválida', () => {
            expect(() => validator.validatePaymentDate('invalid', 'Paid')).toThrow('Fecha de pago inválida');
        });

        it('debe fallar si se envía fecha de pago pero el estado no es "Paid"', () => {
            expect(() => validator.validatePaymentDate(today.toISOString(), 'Pending')).toThrow('El estado debe ser "Pagado"');
        });
    });

    describe('updatePaymentDate', () => {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        it('debe fallar si es vacío cuando el estado es "Paid"', () => {
            expect(() => validator.updatePaymentDate('', 'Paid')).toThrow('La fecha de pago es obligatoria si el estado es Pagado');
        });

        it('debe fallar si es fecha pasada cuando el estado es "Paid"', () => {
            expect(() => validator.updatePaymentDate(yesterday.toISOString(), 'Paid')).toThrow('La fecha de pago debe ser mayor o igual a la fecha actual');
        });

        it('debe pasar si es vacío cuando el estado no es "Paid"', () => {
            expect(() => validator.updatePaymentDate('', 'Pending')).not.toThrow();
        });

        it('debe fallar con fecha inválida', () => {
            expect(() => validator.updatePaymentDate('invalid', 'Paid')).toThrow('Fecha de pago inválida');
        });

        it('debe fallar si se envía fecha de pago pero el estado no es "Paid"', () => {
            expect(() => validator.updatePaymentDate(today.toISOString(), 'Pending')).toThrow('El estado debe ser "Pagado"');
        });
    });


    describe('cancelPayment', () => {
        it('debe lanzar error si el estado actual es "Canceled"', () => {
            expect(() => validator.cancelPayment('Canceled' as PaymentStatus)).toThrow('El pago ya se encuentra cancelado');
        });

        it('debe permitir cancelar si el estado es "Pending" o "Paid"', () => {
            expect(() => validator.cancelPayment('Pending' as CreatePaymentStatus)).not.toThrow();
            expect(() => validator.cancelPayment('Paid' as CreatePaymentStatus)).not.toThrow();
        });
    });
});
