import React from 'react';
// Subimos dos niveles (components -> src) y entramos a screens
import { styles } from '../../screens/transactions/Transactions.styles';

interface Props {
  type: 'COMPRA' | 'VENTA';
  onChange: (type: 'COMPRA' | 'VENTA') => void;
}

export const TypeToggle = ({ type, onChange }: Props) => {
  return (
    <div className={styles.typeSelectorGrid}>
      <button
        type="button"
        onClick={() => onChange('COMPRA')}
        className={`${styles.typeButtonBase} ${type === 'COMPRA' ? styles.typeBuyActive : styles.typeInactive}`}
      >
        COMPRAR
      </button>
      <button
        type="button"
        onClick={() => onChange('VENTA')}
        className={`${styles.typeButtonBase} ${type === 'VENTA' ? styles.typeSellActive : styles.typeInactive}`}
      >
        VENDER
      </button>
    </div>
  );
};