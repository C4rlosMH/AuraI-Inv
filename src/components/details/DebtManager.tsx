import React, { useState, useEffect } from 'react';
import { X, Settings, Plus, ArrowUpRight, ArrowDownRight, ArrowLeft, History, CreditCard } from 'lucide-react';
import { useDB } from '../../db/DBContext';
import { accounts, transactions } from '../../db/schema';
import { eq, desc } from 'drizzle-orm';
import { styles } from '../../screens/home/Home.styles';
import { formatMXN } from '../../utils/formatters';
import currency from 'currency.js';

interface Props {
  onBack: () => void;
}

export const DebtManager = ({ onBack }: Props) => {
  const { db, saveDB } = useDB();
  
  // Datos
  const [debtAccounts, setDebtAccounts] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  
  // Estados de Interfaz
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [selectedAcc, setSelectedAcc] = useState<any>(null); // Null = Home, Objeto = Editar, {id: 'NEW'} = Crear
  
  // Estados de Edición
  const [editName, setEditName] = useState('');
  const [editLimit, setEditLimit] = useState('');
  const [editBalance, setEditBalance] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [db]);

  const loadData = async () => {
    const accs = await db.select().from(accounts);
    const debts = accs.filter((a: any) => a.type === 'DEUDA');
    setDebtAccounts(debts);

    if (debts.length > 0) {
      const debtIds = debts.map((d: any) => d.id);
      const txs = await db.select().from(transactions).orderBy(desc(transactions.timestamp));
      const debtTxs = txs.filter((tx: any) => debtIds.includes(tx.originAccountId) || debtIds.includes(tx.destinationAccountId));
      setHistory(debtTxs);
    }
  };

  // Función para abrir una tarjeta existente
  const handleSelect = (acc: any) => {
    setSelectedAcc(acc);
    setEditName(acc.name);
    setEditLimit((acc.creditLimit || acc.credit_limit || 0).toString());
    setEditBalance(Math.abs(acc.balance).toString());
  };

  // Función para abrir formulario en blanco
  const handleAddNew = () => {
    setSelectedAcc({ id: 'NEW', balance: 0 });
    setEditName('');
    setEditLimit('');
    setEditBalance('');
  };

  // Motor para guardar o crear tarjetas
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const newLimit = currency(editLimit).value;
      const newBal = currency(editBalance || 0).multiply(-1).value; 
      const delta = currency(newBal).subtract(selectedAcc.balance || 0).value;

      let targetId = selectedAcc.id;

      if (selectedAcc.id === 'NEW') {
        targetId = crypto.randomUUID();
        await db.insert(accounts).values({
          id: targetId,
          name: editName,
          type: 'DEUDA',
          balance: newBal,
          creditLimit: newLimit
        });
      } else {
        await db.update(accounts)
          .set({ name: editName, creditLimit: newLimit, balance: newBal })
          .where(eq(accounts.id, targetId));
      }

      // Asiento de ajuste silencioso o de apertura
      if (delta !== 0) {
        const txId = crypto.randomUUID();
        await db.insert(transactions).values({
          id: txId,
          type: delta > 0 ? 'DEPOSITO' : 'RETIRO',
          destinationAccountId: delta > 0 ? targetId : null,
          originAccountId: delta < 0 ? targetId : null,
          quantity: Math.abs(delta),
          concept: selectedAcc.id === 'NEW' ? 'Saldo Inicial de Tarjeta' : 'Ajuste de Saldo de Crédito',
          category: 'Ajuste de Sistema',
          timestamp: Date.now()
        });
      }

      await saveDB();
      await loadData();
      setSelectedAcc(null);
      window.dispatchEvent(new Event('db-update'));
    } catch (error) {
      console.error("Error al guardar tarjeta:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const globalDebt = debtAccounts.reduce((acc, card) => currency(acc).add(Math.abs(card.balance)).value, 0);
  const globalLimit = debtAccounts.reduce((acc, card) => currency(acc).add(card.creditLimit || card.credit_limit || 0).value, 0);

  const renderHistoryList = (txList: any[]) => {
    if (txList.length === 0) {
      return (
        <div className="bg-slate-900/40 p-6 rounded-3xl border border-dashed border-slate-700 text-center mt-4">
          <span className="text-slate-500 text-xs">No hay movimientos registrados.</span>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-3 mt-4">
        {txList.map(tx => {
          const isGasto = debtAccounts.some((d: any) => d.id === tx.destinationAccountId);
          return (
            <div key={tx.id} className="bg-slate-900/40 border border-slate-800/50 rounded-2xl p-4 flex justify-between items-center hover:bg-slate-900/60 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl border border-white/5 ${isGasto ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                  {isGasto ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm">{tx.concept}</h4>
                  <span className="text-slate-500 text-[10px] uppercase font-bold">
                    {new Date(tx.timestamp).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
              <div className={`font-bold text-sm ${isGasto ? 'text-rose-400' : 'text-emerald-400'}`}>
                {isGasto ? '-' : '+'}{formatMXN(tx.quantity)}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalCard}>
        
        {/* HEADER DINÁMICO */}
        <div className={styles.modalHeader}>
          <div className="flex items-center gap-2">
            {showAllHistory || selectedAcc ? (
              <button onClick={() => { setShowAllHistory(false); setSelectedAcc(null); }} className="mr-1 text-slate-400 hover:text-white transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            ) : null}
            <h2 className={styles.modalTitle}>
              {selectedAcc ? (selectedAcc.id === 'NEW' ? 'Añadir Tarjeta' : 'Ajustes de Cuenta') : (showAllHistory ? 'Historial Completo' : 'Gestión de Créditos')}
            </h2>
          </div>
          <button onClick={onBack} className={styles.closeBtn}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* VISTA 1: EDICIÓN O CREACIÓN DE TARJETA */}
        {selectedAcc && (
          <form onSubmit={handleSaveSettings} className="flex flex-col gap-4 animate-fade-in">
            <div className={styles.inputGroup}>
              <label className={styles.label}>Nombre de la Tarjeta</label>
              <input type="text" className={styles.input} value={editName} onChange={e => setEditName(e.target.value)} required placeholder="Ej. Nu, RappiCard..." />
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Límite de Crédito Autorizado</label>
              <input type="number" step="any" min="0" className={styles.input} value={editLimit} onChange={e => setEditLimit(e.target.value)} required placeholder="Ej. 10000" />
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.label}>{selectedAcc.id === 'NEW' ? 'Deuda Inicial (Opcional)' : 'Deuda Actual (Ajuste)'}</label>
              <input type="number" step="any" min="0" className={styles.input} value={editBalance} onChange={e => setEditBalance(e.target.value)} required={selectedAcc.id !== 'NEW'} placeholder="0.00" />
            </div>
            <button type="submit" disabled={isSaving} className={`${styles.submitBtn} mt-2 flex justify-center items-center`}>
              {isSaving ? 'Guardando...' : (selectedAcc.id === 'NEW' ? 'Crear Tarjeta' : 'Guardar Cambios')}
            </button>
          </form>
        )}

        {/* VISTA 2: HISTORIAL COMPLETO */}
        {!selectedAcc && showAllHistory && (
          <div className="animate-fade-in pb-4 overflow-y-auto max-h-[70vh] custom-scrollbar">
            {renderHistoryList(history)}
          </div>
        )}

        {/* VISTA 3: DASHBOARD PRINCIPAL */}
        {!selectedAcc && !showAllHistory && (
          <div className="animate-fade-in flex flex-col gap-6">
            
            <div className="flex flex-col items-center justify-center mt-2 mb-4">
              <span className="text-slate-400 text-[10px] font-bold tracking-widest uppercase mb-1">Deuda Global Actual</span>
              <h1 className="text-rose-400 text-4xl font-bold tracking-tight">{formatMXN(globalDebt)}</h1>
              <div className="bg-slate-800/50 border border-slate-700/50 px-3 py-1 rounded-full mt-3">
                <span className="text-[10px] font-bold text-slate-400">Límite Combinado: <span className="text-emerald-400">{formatMXN(globalLimit)}</span></span>
              </div>
            </div>

            <div>
              {/* AQUÍ RESTAURAMOS EL BOTÓN + AÑADIR */}
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-slate-400 text-[10px] font-bold tracking-widest uppercase">Mis Tarjetas ({debtAccounts.length})</h3>
                <button 
                  onClick={handleAddNew}
                  className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 rounded-lg border border-emerald-500/20 transition-colors text-[10px] font-bold uppercase tracking-wider"
                >
                  <Plus className="w-3.5 h-3.5" /> Añadir
                </button>
              </div>

              <div className="flex flex-col gap-3">
                {debtAccounts.length === 0 ? (
                  <div className="bg-slate-900/40 p-6 rounded-3xl border border-dashed border-slate-700 text-center">
                    <span className="text-slate-500 text-xs">No tienes tarjetas de crédito registradas.</span>
                  </div>
                ) : (
                  debtAccounts.map(acc => {
                    const limit = acc.creditLimit || acc.credit_limit || 0;
                    const currentDebt = Math.abs(acc.balance);
                    
                    return (
                      <div key={acc.id} className="bg-slate-900/40 border border-slate-800/50 rounded-2xl p-4 flex justify-between items-center hover:bg-slate-900/60 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl border border-white/5 bg-rose-500/10 text-rose-400">
                            <CreditCard className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-white font-bold text-sm">{acc.name}</h4>
                            <span className="text-slate-500 text-[10px] font-bold">Uso: <span className="text-rose-400">{formatMXN(currentDebt)}</span> <span className="opacity-40">•</span> Tope: <span className="text-emerald-400">{formatMXN(limit)}</span></span>
                          </div>
                        </div>
                        <button onClick={() => handleSelect(acc)} className="p-2 text-slate-500 hover:text-white transition-colors">
                          <Settings className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div>
              <h3 className="text-slate-400 text-[10px] font-bold tracking-widest uppercase">Historial Reciente</h3>
              
              {renderHistoryList(history.slice(0, 10))}

              {history.length > 0 && (
                <button 
                  onClick={() => setShowAllHistory(true)}
                  className="w-full mt-4 bg-slate-800/30 hover:bg-slate-800/60 border border-slate-700/50 text-slate-300 text-[11px] font-bold uppercase tracking-wider py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <History className="w-4 h-4 text-slate-400" />
                  Ver todos los movimientos ({history.length})
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};