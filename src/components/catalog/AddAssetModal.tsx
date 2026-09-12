import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useDB } from '../../db/DBContext';
import { addAsset } from '../../services/catalogService';
import { styles } from '../../screens/home/Home.styles';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export const AddAssetModal = ({ onClose, onSuccess }: Props) => {
  const { db, saveDB } = useDB();
  
  const [ticker, setTicker] = useState('');
  const [category, setCategory] = useState<'ETF' | 'FIBRA' | 'ACCION' | 'CRIPTO'>('ETF');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!ticker.trim()) {
      setError('El Ticker del instrumento es obligatorio.');
      return;
    }

    try {
      await addAsset(db, saveDB, {
        ticker: ticker.toUpperCase(),
        category,
      });
      onSuccess();
    } catch (err: any) {
      setError('Error al registrar el activo.');
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalCard}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Nuevo Instrumento</h2>
          <button onClick={onClose} className={styles.closeBtn}><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Símbolo / Ticker</label>
            <input 
              type="text" placeholder="Ej. VOO, FUNO11, ETH..." 
              className={`${styles.input} uppercase`} value={ticker} onChange={e => setTicker(e.target.value)} autoFocus
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Categoría de Riesgo</label>
            <select className={styles.select} value={category} onChange={e => setCategory(e.target.value as any)}>
              <option value="ETF">Fondo Indexado (ETF)</option>
              <option value="FIBRA">Bienes Raíces (FIBRA)</option>
              <option value="ACCION">Acción Individual</option>
              <option value="CRIPTO">Criptomoneda</option>
            </select>
          </div>

          {error && <div className="text-rose-500 text-xs text-center mt-2 font-semibold">{error}</div>}

          <button type="submit" className={styles.submitBtn}>Añadir al Catálogo</button>
        </form>
      </div>
    </div>
  );
};