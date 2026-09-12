import React from 'react';
import { formatMXN } from '../../utils/formatters';
import { styles } from '../../screens/transactions/Transactions.styles';

interface Props {
  type: 'COMPRA' | 'VENTA';
  totalCost: number;
  netProceeds: number;
}

export const SummaryPanel = ({ type, totalCost, netProceeds }: Props) => {
  const isBuy = type === 'COMPRA';
  
  return (
    <div className={styles.summaryBox}>
      <span className={styles.summaryLabel}>
        {isBuy ? 'Costo Total Estimado' : 'Retorno Neto Estimado'}
      </span>
      <span className={styles.summaryValue}>
        {formatMXN(isBuy ? totalCost : netProceeds)}
      </span>
    </div>
  );
};