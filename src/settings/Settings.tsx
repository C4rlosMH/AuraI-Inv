import React, { useState, useEffect } from 'react';
import { Save, Trash2, Moon, Sun, Monitor, AlertTriangle, Settings as SettingsIcon, ArrowLeft } from 'lucide-react';
import { useDB } from '../db/DBContext';
import { accounts } from '../db/schema';
import { updateAccountSettings, deleteAccount } from '../services/catalogService';

type Theme = 'light' | 'dark' | 'system';

interface SettingsProps {
  onBack?: () => void;
}

export default function Settings({ onBack }: SettingsProps) {
  const { db, saveDB, isReady } = useDB();
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) || 'system');
  const [allAccounts, setAllAccounts] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Estados del formulario inline
  const [editName, setEditName] = useState('');
  const [editBalance, setEditBalance] = useState('');
  const [editLimit, setEditLimit] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Lógica del Cambio de Tema
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const fetchAccounts = async () => {
    if (!isReady || !db) return;
    const data = await db.select().from(accounts);
    setAllAccounts(data);
  };

  useEffect(() => {
    fetchAccounts();
    window.addEventListener('db-update', fetchAccounts);
    return () => window.removeEventListener('db-update', fetchAccounts);
  }, [isReady, db]);

  const handleExpand = (acc: any) => {
    if (expandedId === acc.id) {
      setExpandedId(null);
    } else {
      setExpandedId(acc.id);
      setEditName(acc.name);
      setEditBalance(acc.type === 'DEUDA' ? Math.abs(acc.balance).toString() : acc.balance.toString());
      setEditLimit((acc.creditLimit ?? acc.credit_limit ?? 0).toString());
    }
  };

  const handleSave = async (acc: any) => {
    setIsSaving(true);
    try {
      const numericBalance = parseFloat(editBalance) || 0;
      const finalBalance = acc.type === 'DEUDA' ? -Math.abs(numericBalance) : numericBalance;
      
      await updateAccountSettings(db, saveDB, acc.id, {
        name: editName,
        balance: finalBalance,
        creditLimit: acc.type === 'DEUDA' ? (parseFloat(editLimit) || 0) : undefined
      });
      
      setExpandedId(null);
      window.dispatchEvent(new Event('db-update')); // Refresca toda la app
    } catch (error) {
      console.error("Error al actualizar la cuenta:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (accId: string) => {
    if(!confirm("¿Eliminar cuenta? Esta acción es irreversible y recalculará tu Patrimonio Neto global.")) return;
    setIsSaving(true);
    try {
      await deleteAccount(db, saveDB, accId);
      setExpandedId(null);
      window.dispatchEvent(new Event('db-update'));
    } catch (error) {
      console.error("Error al eliminar la cuenta:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Agrupación de cuentas
  const grouped = {
    'Cuentas Maestras': allAccounts.filter(a => a.type === 'EFECTIVO'),
    'Inversiones & Cripto': allAccounts.filter(a => a.type === 'INVERSION'),
    'Crédito & Deuda': allAccounts.filter(a => a.type === 'DEUDA'),
  };

  return (
    <div className="p-4 pb-24 max-w-2xl mx-auto flex flex-col gap-8 animate-fade-in text-slate-800 dark:text-slate-200">
      <header className="flex items-center gap-3 mb-2">
        {onBack && (
          <button 
            onClick={onBack} 
            className="p-2 -ml-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
        )}
        <SettingsIcon className="w-8 h-8 text-indigo-500" />
        <h1 className="text-2xl font-bold">Configuración</h1>
      </header>

      {/* --- SECCIÓN TEMA --- */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-800">
        <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Apariencia</h2>
        <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl">
          <button 
            onClick={() => setTheme('light')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${theme === 'light' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <Sun className="w-4 h-4" /> Claro
          </button>
          <button 
            onClick={() => setTheme('dark')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${theme === 'dark' ? 'bg-slate-800 text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <Moon className="w-4 h-4" /> Oscuro
          </button>
          <button 
            onClick={() => setTheme('system')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${theme === 'system' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <Monitor className="w-4 h-4" /> Sistema
          </button>
        </div>
      </section>

      {/* --- SECCIÓN GESTIÓN DE CUENTAS --- */}
      <section>
        <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Gestión de Cuentas (Ajustes Manuales)</h2>
        
        <div className="flex flex-col gap-6">
          {Object.entries(grouped).map(([groupName, accounts]) => accounts.length > 0 && (
            <div key={groupName} className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold text-slate-400 ml-1">{groupName}</h3>
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                
                {accounts.map((acc, idx) => {
                  const isExpanded = expandedId === acc.id;
                  const isDebt = acc.type === 'DEUDA';
                  
                  return (
                    <div key={acc.id} className={idx !== accounts.length - 1 ? 'border-b border-slate-100 dark:border-slate-800/50' : ''}>
                      {/* Vista Compacta (Click para expandir) */}
                      <div 
                        onClick={() => handleExpand(acc)}
                        className="p-4 flex justify-between items-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <span className="font-medium">{acc.name}</span>
                        <span className={`font-mono font-medium ${isDebt ? 'text-rose-500' : 'text-emerald-500'}`}>
                          ${Math.abs(acc.balance).toLocaleString()}
                        </span>
                      </div>

                      {/* Vista Expandida (Editor Inline) */}
                      {isExpanded && (
                        <div className="p-4 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800/50 flex flex-col gap-4 animate-fade-in">
                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-slate-500">Nombre de la cuenta</label>
                            <input 
                              type="text" 
                              value={editName} 
                              onChange={e => setEditName(e.target.value)} 
                              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-sm focus:outline-none focus:border-indigo-500"
                            />
                          </div>

                          {isDebt && (
                            <div className="flex flex-col gap-1">
                              <label className="text-xs font-medium text-slate-500">Límite de Crédito</label>
                              <input 
                                type="number" 
                                step="any"
                                value={editLimit} 
                                onChange={e => setEditLimit(e.target.value)} 
                                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-sm focus:outline-none focus:border-indigo-500 font-mono"
                              />
                            </div>
                          )}

                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-slate-500">
                              {isDebt ? 'Deuda Actual (Ajuste contable directo)' : 'Saldo Actual (Ajuste contable directo)'}
                            </label>
                            <input 
                              type="number" 
                              step="any"
                              value={editBalance} 
                              onChange={e => setEditBalance(e.target.value)} 
                              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-sm focus:outline-none focus:border-indigo-500 font-mono"
                            />
                          </div>

                          <div className="flex gap-2 mt-2">
                            <button 
                              onClick={() => handleDelete(acc.id)}
                              disabled={isSaving}
                              className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-lg transition-colors border border-rose-500/20"
                              title="Eliminar cuenta"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={() => handleSave(acc)}
                              disabled={isSaving}
                              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white flex justify-center items-center gap-2 rounded-lg text-sm font-bold transition-colors"
                            >
                              <Save className="w-4 h-4" />
                              {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}