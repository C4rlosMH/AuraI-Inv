import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useDB } from '../../db/DBContext';
import { addAccount } from '../../services/catalogService';
import { styles } from '../../screens/home/Home.styles';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export const AddAccountModal = ({ onClose, onSuccess }: Props) => {
  const { db, saveDB } = useDB();
  
  // 1. Agregamos 'FONDO' a los tipos permitidos
  const [name, setName] = useState('');
  const [type, setType] = useState<'EFECTIVO' | 'DEUDA' | 'INVERSION' | 'FONDO'>('EFECTIVO');
  const [initialBalance, setInitialBalance] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!name.trim()) {
      setError('El nombre de la cuenta es obligatorio.');
      return;
    }

    try {
      await addAccount(db, saveDB, {
        name,
        type,
        initialBalance: parseFloat(initialBalance) || 0,
      });
      onSuccess();
    } catch (err: any) {
      setError('Error al crear la cuenta en la base de datos.');
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalCard}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Nueva Cuenta</h2>
          <button onClick={onClose} className={styles.closeBtn}><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Nombre de la Institución / Cuenta</label>
            <input 
              type="text" placeholder="Ej. BBVA, Nu Crédito, Viaje a Japón..." 
              className={styles.input} value={name} onChange={e => setName(e.target.value)} autoFocus
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Clasificación Contable</label>
            <select className={styles.select} value={type} onChange={e => setType(e.target.value as any)}>
              <option value="EFECTIVO">Liquidez / Débito (Cuenta Maestra)</option>
              <option value="FONDO">Fondo de Ahorro / Reserva</option>
              <option value="INVERSION">Casa de Bolsa (GBM, Cripto)</option>
              <option value="DEUDA">Pasivo / Crédito (Tarjetas, Préstamos)</option>
            </select>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>
              {type === 'DEUDA' ? 'Saldo Deudor Inicial (Negativo)' : 'Saldo Inicial'}
            </label>
            <input 
              type="number" step="any" placeholder="$0.00" 
              className={styles.input} value={initialBalance} onChange={e => setInitialBalance(e.target.value)}
            />
          </div>

          {error && <div className="text-rose-500 text-xs text-center mt-2 font-semibold">{error}</div>}

          <button type="submit" className={styles.submitBtn}>Crear Cuenta</button>
        </form>
      </div>
    </div>
  );
};