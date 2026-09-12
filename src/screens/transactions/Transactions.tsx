import React, { useState } from 'react';
import { useDB } from '../../db/DBContext';
import { useCatalog } from '../../hooks/useCatalog';
import { executePurchase, executeSale } from '../../services/ledgerService';
import { calculateOperationTotal } from '../../utils/math';
import { formatMXN } from '../../utils/formatters';
import { styles } from './Transactions.styles';

// Componentes extraídos
import { TypeToggle } from '../../components/transactions/TypeToggle';
import { FormGroup } from '../../components/transactions/FormGroup';
import { SummaryPanel } from '../../components/transactions/SummaryPanel';

export default function Transactions() {
  const { db, saveDB } = useDB();
  const { accountsList, assetsList } = useCatalog();

  const [type, setType] = useState<'COMPRA' | 'VENTA'>('COMPRA');
  const [accountId, setAccountId] = useState('');
  const [assetId, setAssetId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Filtrar liquidez disponible
  const availableAccounts = accountsList.filter(acc => acc.type !== 'DEUDA');

  // Cálculos matemáticos en tiempo real (0.25% comisión estándar)
  const q = parseFloat(quantity) || 0;
  const p = parseFloat(price) || 0;
  const estimated = calculateOperationTotal(q, p, 0.0025, true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!accountId || !assetId || q <= 0 || p <= 0) {
      setMessage({ text: 'Completa todos los campos numéricos.', type: 'error' });
      return;
    }

    try {
      const payload = { accountId, assetId, quantity: q, price: p };
      
      if (type === 'COMPRA') {
        await executePurchase(db, saveDB, payload);
        setMessage({ text: 'Orden de compra ejecutada y registrada.', type: 'success' });
      } else {
        await executeSale(db, saveDB, payload);
        setMessage({ text: 'Orden de venta ejecutada. Capital retornado.', type: 'success' });
      }

      setQuantity('');
      setPrice('');
    } catch (error: any) {
      setMessage({ text: error.message || 'Error al ejecutar la transacción.', type: 'error' });
    }
  };

  return (
    <div className={styles.container}>
      <div>
        <h1 className={styles.headerTitle}>Trading Hub</h1>
        <p className={styles.headerSubtitle}>Registro manual de operaciones</p>
      </div>

      <div className={styles.formCard}>
        <form onSubmit={handleSubmit}>
          
          <TypeToggle type={type} onChange={setType} />

          <FormGroup label="Instrumento Financiero">
            <select className={styles.select} value={assetId} onChange={(e) => setAssetId(e.target.value)}>
              <option value="">Selecciona un activo...</option>
              {assetsList.map(asset => (
                <option key={asset.id} value={asset.id}>{asset.ticker} ({asset.category})</option>
              ))}
            </select>
          </FormGroup>

          <FormGroup label={type === 'COMPRA' ? 'Cuenta de Fondeo' : 'Cuenta de Retorno'}>
            <select className={styles.select} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              <option value="">Selecciona una cuenta...</option>
              {availableAccounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name} ({formatMXN(acc.balance)})</option>
              ))}
            </select>
          </FormGroup>

          <div className="grid grid-cols-2 gap-4">
            <FormGroup label="Títulos">
              <input 
                type="number" step="any" min="0" placeholder="0.00" 
                className={styles.input} value={quantity} onChange={(e) => setQuantity(e.target.value)}
              />
            </FormGroup>
            
            <FormGroup label="Precio Ejec. ($)">
              <input 
                type="number" step="any" min="0" placeholder="0.00" 
                className={styles.input} value={price} onChange={(e) => setPrice(e.target.value)}
              />
            </FormGroup>
          </div>

          <SummaryPanel 
            type={type} 
            totalCost={estimated.netTotal} 
            netProceeds={estimated.grossTotal - estimated.commission} 
          />

          <button type="submit" className={type === 'COMPRA' ? styles.submitButtonBuy : styles.submitButtonSell}>
            CONFIRMAR {type}
          </button>

          {message && (
            <div className={message.type === 'success' ? styles.successMessage : styles.errorMessage}>
              {message.text}
            </div>
          )}

        </form>
      </div>
    </div>
  );
}