/**
 * Formatea valores numéricos a formato de moneda MXN ($123,456.78).
 */
export const formatMXN = (amount: number | string): string => {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numericAmount)) return '$0.00';

  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericAmount);
};

/**
 * Formatea porcentajes con prefijo explícito (+ / -) para rendimientos.
 */
export const formatPercentage = (rate: number | string): string => {
  const numericRate = typeof rate === 'string' ? parseFloat(rate) : rate;
  if (isNaN(numericRate)) return '+0.00%';

  const formatted = numericRate.toFixed(2);
  return numericRate > 0 ? `+${formatted}%` : `${formatted}%`;
};

/**
 * Ajusta la visualización de títulos según la clase de activo.
 * Cripto requiere hasta 8 decimales; acciones, fibras y ETFs suelen requerir 0 o 4.
 */
export const formatQuantity = (quantity: number | string, category: string): string => {
  const q = typeof quantity === 'string' ? parseFloat(quantity) : quantity;
  if (isNaN(q)) return '0';

  if (category === 'CRIPTO') {
    return q.toLocaleString('es-MX', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    });
  }

  return q.toLocaleString('es-MX', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
};

export const formatDate = (timestamp: number | string | Date): string => {
  const date = new Date(timestamp);
  
  // Protección contra datos corruptos o fechas nulas
  if (isNaN(date.getTime())) return '--/--/--';

  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(date);
};