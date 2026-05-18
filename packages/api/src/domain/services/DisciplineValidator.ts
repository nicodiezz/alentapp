export class DisciplineValidator {
    validateDates(issue_date: string | Date, expiry_date: string | Date): void {
        if (issue_date >= expiry_date) {
            throw new Error('La fecha de fin de suspensión no puede ser previa o igual a la fecha de inicio');
        }
    }

    validateDateFormat(date: string | Date): void {
        if (date instanceof Date) {
            if (Number.isNaN(date.getTime())) {
                throw new Error('Formato de fecha inválido');
            }
            return;
        }

        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
        if (!match) {
            throw new Error('Formato de fecha inválido');
        }

        const [, yearString, monthString, dayString] = match;
        const year = Number(yearString);
        const month = Number(monthString);
        const day = Number(dayString);
        const parsedDate = new Date(Date.UTC(year, month - 1, day));

        const isValidDate =
            parsedDate.getUTCFullYear() === year &&
            parsedDate.getUTCMonth() === month - 1 &&
            parsedDate.getUTCDate() === day;

        if (!isValidDate) {
            throw new Error('Formato de fecha inválido');
        }
    }
}
