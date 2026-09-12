import React, { useState } from 'react';
import { X, Save, Trash2, AlertTriangle } from 'lucide-react';
import { useDB } from '../../db/DBContext';
import { updateAccountSettings, deleteAccount } from '../../services/catalogService';
import { styles } from '../../screens/home/Home.styles';

interface Props {
  account: any;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditAccountModal = ({ account, onClose, onSuccess }: Props) => {
  const { db, saveDB } = useDB();
  const isDebt = account.type === 'DEUDA';

  const [name, setName] = useState(account.name);
  const [balance, setBalance] = useState(isDebt ? Math.abs(account.balance).toString() : account.balance.toString());
  const initialLimit = account.creditLimit ?? account.credit_limit ?? 0;
  const [creditLimit, setCreditLimit] = useState(initialLimit.toString());
  
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const numericBalance = parseFloat(balance) || 0;
      const finalBalance = isDebt ? -Math.abs(numericBalance) : numericBalance;
      
      await updateAccountSettings(db, saveDB, account.id, {
        name,
        balance: finalBalance,
        creditLimit: isDebt ? (parseFloat(creditLimit) || 0) : undefined
      });
      
      onSuccess();
    } catch (error) {
      console.error("Error al actualizar la cuenta:", error);
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsSaving(true);
    try {
      await deleteAccount(db, saveDB, account.id);
      onSuccess(); // Cierra el modal y refresca la UI
    } catch (error) {
      console.error("Error al eliminar la cuenta:", error);
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalCard}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Ajustes de Cuenta</h2>
          <button onClick={onClose} className={styles.closeBtn}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {showConfirmDelete ? (
          <div className="flex flex-col gap-4 animate-fade-in">
            <div className="bg-rose-500/20 border border-rose-500/50 p-4 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-rose-400 font-bold text-sm">¿Eliminar cuenta?</h3>
                <p className="text-rose-200/70 text-xs mt-1">
                  Esta acción es irreversible. Se eliminará la cuenta y todo su historial de transacciones, lo cual recalculará tu Patrimonio Neto global.
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 mt-2">
              <button 
                onClick={() => setShowConfirmDelete(false)}
                disabled={isSaving}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl transition-colors border border-slate-700 text-sm"
              >
                Cancelar
              </button>
              <button 
                onClick={handleDelete}
                disabled={isSaving}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-xl transition-colors text-sm"
              >
                {isSaving ? 'Borrando...' : 'Sí, Eliminar'}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className={styles.inputGroup}>
              <label className={styles.label}>Nombre de la cuenta</label>
              <input type="text" className={styles.input} value={name} onChange={e => setName(e.target.value)} required />
            </div>

            {isDebt && (
              <div className={styles.inputGroup}>
                <label className={styles.label}>Límite de Crédito Autorizado</label>
                <input type="number" step="any" min="0" className={styles.input} value={creditLimit} onChange={e => setCreditLimit(e.target.value)} />
              </div>
            )}

            <div className={styles.inputGroup}>
              <label className={styles.label}>
                {isDebt ? 'Deuda Actual (Ajuste)' : 'Saldo Actual (Ajuste)'}
              </label>
              <input type="number" step="any" min="0" className={styles.input} value={balance} onChange={e => setBalance(e.target.value)} />
              <p className="text-[10px] text-slate-500 mt-1.5 leading-tight">
                Nota: Modificar el saldo directamente actúa como un asiento contable de ajuste.
              </p>
            </div>

            <div className="flex gap-3 mt-2">
              <button 
                type="button" 
                onClick={() => setShowConfirmDelete(true)}
                className="p-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/20 transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <button 
                type="submit" 
                disabled={isSaving}
                className={`${styles.submitBtn} flex-1 flex justify-center items-center gap-2`}
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};