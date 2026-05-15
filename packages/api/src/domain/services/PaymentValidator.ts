import { CreatePaymentStatus } from '@alentapp/shared';

export class PaymentValidator {

    validateAmount(amount: number): void {
        if (typeof amount !== 'number') {
            throw new Error('Monto inválido');
        }
        if (amount <= 0) {
            throw new Error('El monto debe ser mayor a cero');
        }
    }

    validateMonth(month: number): void {
        if (typeof month !== 'number') {
            throw new Error('El mes debe ser un número');
        }
        if (month < 1 || month > 12) {
            throw new Error('El mes debe estar entre 1 y 12');
        }
    }

    validateYear(year: number): void {
        const currentYear: number = new Date().getFullYear();
        if (typeof year !== 'number') {
            throw new Error('El año debe ser un número');
        }
        if (year < currentYear) {
            throw new Error('El año debe ser mayor o igual al año actual');
        }
    }

    validateDueDate(due_date: string): void {
        if (typeof due_date !== 'string') {
            throw new Error('Fecha de vencimiento inválida');
        }
        const dueDate = new Date(due_date);
        if (!isNaN(dueDate.getTime())) {
            if (dueDate < new Date()) {
                throw new Error('La fecha de vencimiento debe ser mayor o igual a la fecha actual');
            }
        }
    }

    validatePaymentDate(payment_date: string, status: CreatePaymentStatus): void {
        const date = new Date(payment_date);
        if (isNaN(date.getTime())) {
            throw new Error('Fecha de pago inválida');
        }
        if (status !== 'Paid') {
            throw new Error('El status debe ser "Pagado"');
        }
        if (status === 'Paid' && !isNaN(date.getTime())) {
            if (date < new Date()) {
                throw new Error('La fecha de pago debe ser mayor o igual a la fecha actual');
            }
        }
    }

    validateStatus(status: CreatePaymentStatus): void {
        if (status !== 'Paid' && status !== 'Pending') {
            throw new Error('El status debe ser "Pendiente" o "Pagado"');
        }
    }
}
