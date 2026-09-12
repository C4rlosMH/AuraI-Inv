import React from 'react';
import { Banknote, CreditCard, TrendingUp } from 'lucide-react';
import { formatMXN } from '../../utils/formatters';
import { styles } from '../../screens/catalog/Catalog.styles';

interface Props {
  accounts: any[];
}

export const AccountList = ({ accounts }: Props) => {
  const getAccountIcon = (type: string) => {
    if (type === 'EFECTIVO') return <Banknote className="w-5 h-5 text-emerald-400" />;
    if (type === 'DEUDA') return <CreditCard className="w-5 h-5 text-rose-400" />;
    return <TrendingUp className="w-5 h-5 text-blue-400" />;
  };

  return (
    <div className={styles.list}>
      {accounts.map((acc) => (
        <div key={acc.id} className={styles.listItem}>
          <div className={styles.itemLeft}>
            <div className={styles.itemAvatar}>{getAccountIcon(acc.type)}</div>
            <div>
              <div className={styles.itemName}>{acc.name}</div>
              <div className={styles.itemSub}>{acc.type}</div>
            </div>
          </div>
          <div className={styles.itemRight}>
            <div className={`${styles.itemValue} ${acc.balance < 0 ? 'text-rose-500' : ''}`}>
              {formatMXN(acc.balance)}
            </div>
          </div>
        </div>
      ))}
      {accounts.length === 0 && <p className="text-slate-500 text-sm text-center py-2">No hay cuentas registradas</p>}
    </div>
  );
};