import React from 'react';
import { styles } from '../../screens/transactions/Transactions.styles';

interface Props {
  label: string;
  children: React.ReactNode;
}

export const FormGroup = ({ label, children }: Props) => {
  return (
    <div className={styles.inputGroup}>
      <label className={styles.label}>{label}</label>
      {children}
    </div>
  );
};