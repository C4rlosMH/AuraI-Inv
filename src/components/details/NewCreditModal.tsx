import React, { useState } from 'react';
import { X, PlusCircle } from 'lucide-react';
import { useDB } from '../../db/DBContext';
import { createNewCreditAccount } from '../../services/catalogService';
import { styles } from '../../screens/home/Home.styles';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export const NewCreditModal = ({ onClose, onSuccess }: Props) => {
  const { db, saveDB } = useDB();

  const [name, setName] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [balance, setBalance] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const limitVal = parseFloat(creditLimit) || 0;
      const balanceVal = parseFloat(balance) || 0;
      
      // La deuda SIEMPRE debe guardarse como negativa en el motor contable
      const finalBalance = balanceVal > 0 ? -balanceVal : balanceVal;
      
      await createNewCreditAccount(db, saveDB, {
        name,
        creditLimit: limitVal,
        balance: finalBalance
      });
      
      onSuccess();
    } catch (error) {
      console.error("Error al crear tarjeta:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalCard}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Añadir Tarjeta de Crédito</h2>
          <button onClick={onClose} className={styles.closeBtn}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 animate-fade-in">
          <div className={styles.inputGroup}>
            <label className={styles.label}>Nombre de la Institución / Tarjeta</label>
            <input 
              type="text" 
              className={styles.input} 
              placeholder="Ej. Nu, RappiCard, Mercado Pago..."
              value={name} 
              onChange={e => setName(e.target.value)} 
              required 
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Límite de Crédito Autorizado</label>
            <input 
              type="number" 
              step="any" 
              min="0"
              className={styles.input} 
              placeholder="0.00"
              value={creditLimit} 
              onChange={e => setCreditLimit(e.target.value)} 
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Deuda Actual (Saldo a Pagar)</label>
            <input 
              type="number" 
              step="any" 
              min="0"
              className={styles.input} 
              placeholder="0.00"
              value={balance} 
              onChange={e => setBalance(e.target.value)} 
            />
            <p className="text-[10px] text-slate-500 mt-1.5 leading-tight">
              Ingresa el monto como positivo (Ej. 1500). El sistema lo registrará automáticamente como un pasivo contable.
            </p>
          </div>

          <button 
            type="submit" 
            disabled={isSaving || !name}
            className={`${styles.submitBtn} flex justify-center items-center gap-2 mt-2 bg-emerald-600 hover:bg-emerald-700`}
          >
            <PlusCircle className="w-4 h-4" />
            {isSaving ? 'Creando...' : 'Crear Tarjeta'}
          </button>
        </form>
      </div>
    </div>
  );
};