import React from 'react';
import { Zap, BarChart, Building2 } from 'lucide-react';
import { formatMXN, formatQuantity } from '../../utils/formatters';
import { styles } from '../../screens/catalog/Catalog.styles';

interface Props {
  assets: any[];
}

export const AssetList = ({ assets }: Props) => {
  const getAssetIcon = (category: string) => {
    if (category === 'CRIPTO') return <Zap className="w-5 h-5 text-yellow-400 fill-yellow-400/20" />;
    if (category === 'ETF' || category === 'ACCION') return <BarChart className="w-5 h-5 text-emerald-400" />;
    return <Building2 className="w-5 h-5 text-purple-400" />;
  };

  return (
    <div className={styles.list}>
      {assets.map((asset) => (
        <div key={asset.id} className={styles.listItem}>
          <div className={styles.itemLeft}>
            <div className={styles.itemAvatar}>{getAssetIcon(asset.category)}</div>
            <div>
              <div className={styles.itemName}>{asset.ticker}</div>
              <div className={styles.itemSub}>{asset.category}</div>
            </div>
          </div>
          <div className={styles.itemRight}>
            <div className={styles.itemValue}>
              {formatQuantity(asset.totalTitles, asset.category)} Títulos
            </div>
            <div className={styles.itemDetail}>
              CPP: {formatMXN(asset.averageCost)}
            </div>
          </div>
        </div>
      ))}
      {assets.length === 0 && <p className="text-slate-500 text-sm text-center py-2">No hay activos registrados</p>}
    </div>
  );
};