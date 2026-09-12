import React, { useState, useEffect } from 'react';
import { X, WalletCards } from 'lucide-react';
import { useDB } from '../../db/DBContext';
import { accounts, transactions } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { styles } from '../../screens/home/Home.styles';
import { formatMXN } from '../../utils/formatters';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export const PaycheckModal = ({ onClose, onSuccess }: Props) => {
  const { db, saveDB } = useDB();
  const [accountsList, setAccountsList] = useState<any[]>([]);
  
  const [bankId, setBankId] = useState('');
  const [cashId, setCashId] = useState('');
  
  const [bankAmount, setBankAmount] = useState('');
  const [cashAmount, setCashAmount] = useState('');
  const [concept, setConcept] = useState('Pago Semanal / Nómina');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadAccounts = async () => {
      const accs = await db.select().from(accounts);
      // Filtramos solo las cuentas operativas
      const opAccs = accs.filter((a: any) => a.type === 'EFECTIVO');
      setAccountsList(opAccs);
      
      // Auto-selección inteligente buscando palabras clave
      const bank = opAccs.find((a: any) => a.name.toLowerCase().includes('banco') || a.name.toLowerCase().includes('bóveda'));
      const cash = opAccs.find((a: any) => a.name.toLowerCase().includes('efectivo') || a.name.toLowerCase().includes('caja'));
      
      if (bank) setBankId(bank.id);
      else if (opAccs.length > 0) setBankId(opAccs[0].id);
      
      if (cash) setCashId(cash.id);
      else if (opAccs.length > 1) setCashId(opAccs[1].id);
    };
    loadAccounts();
  }, [db]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const bAmount = parseFloat(bankAmount) || 0;
      const cAmount = parseFloat(cashAmount) || 0;
      
      if (bAmount <= 0 && cAmount <= 0) throw new Error("Debes ingresar al menos un monto");

      const timestamp = Date.now();

      // 1. Procesar ingreso al Banco
      if (bAmount > 0 && bankId) {
        const txId = crypto.randomUUID();
        await db.insert(transactions).values({
          id: txId, type: 'DEPOSITO', destinationAccountId: bankId, quantity: bAmount, concept, timestamp
        });
        const bAcc = await db.select().from(accounts).where(eq(accounts.id, bankId));
        await db.update(accounts).set({ balance: bAcc[0].balance + bAmount }).where(eq(accounts.id, bankId));
      }

      // 2. Procesar ingreso al Efectivo (Caja)
      if (cAmount > 0 && cashId) {
        const txId = crypto.randomUUID();
        await db.insert(transactions).values({
          id: txId, type: 'DEPOSITO', destinationAccountId: cashId, quantity: cAmount, concept, timestamp
        });
        const cAcc = await db.select().from(accounts).where(eq(accounts.id, cashId));
        await db.update(accounts).set({ balance: cAcc[0].balance + cAmount }).where(eq(accounts.id, cashId));
      }

      await saveDB();
      onSuccess();
    } catch (error) {
      console.error("Error al registrar ingreso dividido:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const totalAmount = (parseFloat(bankAmount) || 0) + (parseFloat(cashAmount) || 0);

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalCard}>
        <div className={styles.modalHeader}>
          <div className="flex items-center gap-2">
            <WalletCards className="w-5 h-5 text-blue-400" />
            <h2 className={styles.modalTitle}>Registro de Pago</h2>
          </div>
          <button onClick={onClose} className={styles.closeBtn}><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 animate-fade-in">
          
          <div className="flex gap-3 bg-slate-900/30 p-3 rounded-xl border border-slate-800/50">
            <div className="w-1/2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">A Banco / Bóveda</label>
              <select className={styles.input} value={bankId} onChange={e => setBankId(e.target.value)}>
                <option value="">Ninguno</option>
                {accountsList.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
              </select>
            </div>
            <div className="w-1/2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Monto ($)</label>
              <input type="number" step="any" min="0" className={styles.input} value={bankAmount} onChange={e => setBankAmount(e.target.value)} placeholder="0.00" />
            </div>
          </div>

          <div className="flex gap-3 bg-slate-900/30 p-3 rounded-xl border border-slate-800/50">
            <div className="w-1/2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">A Caja / Efectivo</label>
              <select className={styles.input} value={cashId} onChange={e => setCashId(e.target.value)}>
                <option value="">Ninguno</option>
                {accountsList.map(acc => <option key={acc.id} value={acc.id} disabled={acc.id === bankId}>{acc.name}</option>)}
              </select>
            </div>
            <div className="w-1/2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Monto ($)</label>
              <input type="number" step="any" min="0" className={styles.input} value={cashAmount} onChange={e => setCashAmount(e.target.value)} placeholder="0.00" />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Concepto del Ingreso</label>
            <input type="text" className={styles.input} value={concept} onChange={e => setConcept(e.target.value)} required />
          </div>

          <div className="flex justify-between items-center px-2 pt-2 border-t border-slate-800">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Ingreso Total:</span>
            <span className="text-emerald-400 font-bold text-lg">{formatMXN(totalAmount)}</span>
          </div>

          <button type="submit" disabled={isSaving || totalAmount <= 0} className={`${styles.submitBtn} mt-2 flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700`}>
            {isSaving ? 'Registrando...' : 'Confirmar Ingreso'}
          </button>
        </form>
      </div>
    </div>
  );
};