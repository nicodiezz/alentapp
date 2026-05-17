import type {
  PaymentDTO,
  CreatePaymentRequest, UpdatePaymentRequest
} from '@alentapp/shared';

const API_URL =
  (import.meta.env.VITE_API_URL ||
    'http://localhost:3000') + '/api/v1';

const formatDate = (date: string | null | undefined) => {
  if (!date) return 'No pagado';

  return new Date(date)
    .toISOString()
    .split('T')[0];
};

export const paymentsService = {
  async create(data: CreatePaymentRequest): Promise<PaymentDTO> {
    const response = await fetch(`${API_URL}/payments`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();

      throw new Error(
        errorData.error ||
        'Error al crear el pago'
      );
    }

    const result = await response.json();

    return {
      ...result.data,
      due_date: formatDate(
        result.data.due_date
      ),
      payment_date: formatDate(
        result.data.payment_date
      ),
    };
  },

  async findAll(): Promise<PaymentDTO[]> {

    const response = await fetch(
      `${API_URL}/payments`
    );

    if (!response.ok) {
      const errorData = await response.json();

      throw new Error(
        errorData.error ||
        'Error al obtener los pagos'
      );
    }

    const result = await response.json();

    return result.data.map(
      (payment: PaymentDTO) => ({
        ...payment,

        due_date: formatDate(
          payment.due_date
        ),

        payment_date: formatDate(
          payment.payment_date
        ),
      })
    );
  },

  async findById(id: string): Promise<PaymentDTO> {
    const response = await fetch(`${API_URL}/payments/${id}`);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al obtener el pago');
    }

    const result = await response.json();

    return {
      ...result.data,
      due_date: formatDate(result.data.due_date),
      payment_date: formatDate(result.data.payment_date),
    };
  },

  async update(id: string, data: UpdatePaymentRequest): Promise<PaymentDTO> {
    const response = await fetch(`${API_URL}/payments/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al actualizar el pago');
    }

    const result = await response.json();

    return {
      ...result.data,
      due_date: formatDate(result.data.due_date),
      payment_date: formatDate(result.data.payment_date),
    };
  }

};