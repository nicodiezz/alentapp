import { CreatePaymentStatus, PaymentStatus } from '@alentapp/shared';

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
        if (isNaN(dueDate.getTime())) {
            throw new Error('Fecha de vencimiento inválida');
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (dueDate < today) {
            throw new Error('La fecha de vencimiento debe ser mayor o igual a la fecha actual');
        }
    }

    validatePaymentDate(payment_date: string, status: CreatePaymentStatus): void {

        if (status === 'Paid' && !payment_date) {
            throw new Error(`La fecha de pago es obligatoria si el estado es Pagado`);
        }

        if (!payment_date) {
            return;
        }

        const date = new Date(payment_date);

        if (isNaN(date.getTime())) {
            throw new Error('Fecha de pago inválida');
        }

        if (status !== 'Paid') {
            throw new Error('El estado debe ser "Pagado"');
        }

        if (status === 'Paid' && !isNaN(date.getTime())) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (date < today) {
                throw new Error('La fecha de pago debe ser mayor o igual a la fecha actual');
            }
        }
    }

    validateStatus(status: CreatePaymentStatus): void {
        if (status !== 'Paid' && status !== 'Pending') {
            throw new Error('El estado debe ser "Pendiente" o "Pagado"');
        }
    }

    updatePaymentDate(payment_date: string, status: CreatePaymentStatus): void {

        if (status === 'Paid' && !payment_date) {
            throw new Error(`La fecha de pago es obligatoria si el estado es Pagado`);
        }

        if (!payment_date) {
            return;
        }

        const date = new Date(payment_date);

        if (isNaN(date.getTime())) {
            throw new Error('Fecha de pago inválida');
        }

        if (status !== 'Paid') {
            throw new Error('El estado debe ser "Pagado"');
        }

        if (status === 'Paid' && !isNaN(date.getTime())) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (date < today) {
                throw new Error('La fecha de pago debe ser mayor o igual a la fecha actual');
            }
        }
    }

    cancelPayment(status: PaymentStatus): void {
        if (status === 'Canceled') {
            throw new Error('El pago ya se encuentra cancelado');
        }
    }
}
