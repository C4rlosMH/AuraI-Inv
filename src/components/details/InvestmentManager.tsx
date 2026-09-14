import React, { useState, useEffect } from 'react';
import { X, Settings, Save, TrendingUp, Bitcoin, Building2 } from 'lucide-react';
import { useDB } from '../../db/DBContext';
import { accounts, transactions } from '../../db/schema';
import { eq } from 'drizzle-orm';
import currency from 'currency.js';
import { styles } from '../../screens/home/Home.styles';
import { formatMXN } from '../../utils/formatters';

interface Props {
  onBack: () => void;
}

export const InvestmentManager = ({ onBack }: Props) => {
  const { db, saveDB } = useDB();
  const [invAccounts, setInvAccounts] = useState<any[]>([]);
  const [selectedAcc, setSelectedAcc] = useState<any>(null);
  
  const [editName, setEditName] = useState('');
  const [editBalance, setEditBalance] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, [db]);

  const loadAccounts = async () => {
    const accs = await db.select().from(accounts);
    setInvAccounts(accs.filter((a: any) => a.type === 'INVERSION'));
  };

  const handleSelect = (acc: any) => {
    setSelectedAcc(acc);
    setEditName(acc.name);
    setEditBalance(acc.balance.toString());
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const newBal = currency(editBalance).value;
      const delta = currency(newBal).subtract(selectedAcc.balance).value;

      // Actualizamos los datos de la cuenta
      await db.update(accounts)
        .set({ name: editName, balance: newBal })
        .where(eq(accounts.id, selectedAcc.id));

      // Si hubo un cambio en el saldo, generamos un Asiento de Ajuste (sin afectar origen)
      // para que las gráficas históricas de tu portafolio no se rompan.
      if (delta !== 0) {
        const txId = crypto.randomUUID();
        await db.insert(transactions).values({
          id: txId,
          type: delta > 0 ? 'DEPOSITO' : 'RETIRO',
          destinationAccountId: delta > 0 ? selectedAcc.id : null,
          originAccountId: delta < 0 ? selectedAcc.id : null,
          quantity: Math.abs(delta),
          concept: 'Asiento de Apertura / Ajuste',
          category: 'Ajuste de Sistema',
          timestamp: Date.now()
        });
      }

      await saveDB();
      await loadAccounts();
      setSelectedAcc(null);
      window.dispatchEvent(new Event('db-update'));
    } catch (error) {
      console.error("Error al guardar ajuste:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const getIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('crypto') || lower.includes('cripto') || lower.includes('bitcoin')) {
      return <Bitcoin className="w-5 h-5 text-emerald-400" />;
    }
    return <TrendingUp className="w-5 h-5 text-emerald-400" />;
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalCard}>
        <div className={styles.modalHeader}>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-400" />
            <h2 className={styles.modalTitle}>
              {selectedAcc ? 'Ajustes de Inversión' : 'Cuentas Bursátiles'}
            </h2>
          </div>
          <button onClick={() => selectedAcc ? setSelectedAcc(null) : onBack()} className={styles.closeBtn}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {!selectedAcc ? (
          <div className="flex flex-col gap-4 animate-fade-in">
            {invAccounts.map(acc => (
              <button 
                key={acc.id}
                onClick={() => handleSelect(acc)}
                className="bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800/50 p-4 rounded-2xl flex items-center justify-between transition-colors text-left group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-slate-800/50 rounded-xl group-hover:bg-slate-800 transition-colors">
                    {getIcon(acc.name)}
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-sm">{acc.name}</h3>
                    <p className="text-slate-500 text-[10px] uppercase tracking-wider font-bold mt-1">
                      Liquidez (Disp): <span className="text-slate-300">{formatMXN(acc.balance)}</span>
                    </p>
                  </div>
                </div>
                <Settings className="w-5 h-5 text-slate-600 group-hover:text-emerald-400 transition-colors" />
              </button>
            ))}
            
            <div className="mt-2 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl">
              <p className="text-emerald-400/80 text-xs leading-relaxed">
                <strong className="text-emerald-400">Nota técnica:</strong> Aquí configuras el Poder de Compra (dinero líquido). El capital invertido en acciones o criptos se gestionará desde el Catálogo de Activos.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSave} className="flex flex-col gap-4 animate-fade-in">
            <div className={styles.inputGroup}>
              <label className={styles.label}>Nombre de la Plataforma</label>
              <input 
                type="text" 
                className={styles.input} 
                value={editName} 
                onChange={e => setEditName(e.target.value)} 
                required 
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Liquidez Disponible (Ajuste)</label>
              <input 
                type="number" 
                step="any" 
                min="0"
                className={styles.input} 
                value={editBalance} 
                onChange={e => setEditBalance(e.target.value)} 
                required 
              />
              <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                Ingresa el saldo exacto en efectivo que tienes disponible para comprar dentro de la plataforma. Modificar esto creará un asiento de apertura automático.
              </p>
            </div>

            <button type="submit" disabled={isSaving} className={`${styles.submitBtn} mt-4 flex justify-center items-center gap-2 bg-emerald-600 hover:bg-emerald-700`}>
              <Save className="w-4 h-4" />
              {isSaving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};