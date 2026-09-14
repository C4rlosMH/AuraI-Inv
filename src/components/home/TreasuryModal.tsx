import React, { useState, useEffect } from 'react';
import { X, ArrowDownToLine, ArrowUpFromLine, ArrowRightLeft, Building2, Wallet, AlertCircle } from 'lucide-react';
import { useDB } from '../../db/DBContext';
import { accounts } from '../../db/schema';
import { processTreasuryTransaction } from '../../services/ledgerService'; // <-- Invocamos al motor
import currency from 'currency.js';
import { styles } from '../../screens/home/Home.styles';
import { formatMXN } from '../../utils/formatters';

type TreasuryType = 'DEPOSITO' | 'RETIRO' | 'TRANSFERENCIA';

interface Props {
  type: TreasuryType;
  onClose: () => void;
  onSuccess: () => void;
}

export const TreasuryModal = ({ type, onClose, onSuccess }: Props) => {
  const { db, saveDB } = useDB();
  const [accountsList, setAccountsList] = useState<any[]>([]);
  
  const [bankAcc, setBankAcc] = useState<any>(null);
  const [cashAcc, setCashAcc] = useState<any>(null);
  
  const [originId, setOriginId] = useState('');
  const [destId, setDestId] = useState('');
  const [amount, setAmount] = useState('');
  const [concept, setConcept] = useState('');
  const [category, setCategory] = useState('');
  
  const [isSplitDeposit, setIsSplitDeposit] = useState(false);
  const [bankAmount, setBankAmount] = useState('');
  const [cashAmount, setCashAmount] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadAccounts = async () => {
      const accs = await db.select().from(accounts);
      setAccountsList(accs);
      
      const bank = accs.find((a: any) => a.type === 'EFECTIVO' && (a.name.toLowerCase().includes('banco') || a.name.toLowerCase().includes('bóveda')));
      const cash = accs.find((a: any) => a.type === 'EFECTIVO' && (a.name.toLowerCase().includes('efectivo') || a.name.toLowerCase().includes('caja')));
      
      setBankAcc(bank);
      setCashAcc(cash);

      if (bank) {
        if (type === 'RETIRO' || type === 'TRANSFERENCIA') setOriginId(bank.id);
        if (type === 'DEPOSITO') setDestId(bank.id);
      }
    };
    loadAccounts();
  }, [db, type]);

  const getOriginOptions = () => {
    if (type === 'RETIRO') return accountsList.filter(a => a.type === 'EFECTIVO' || a.type === 'DEUDA');
    if (type === 'TRANSFERENCIA') return accountsList.filter(a => a.type !== 'DEUDA');
    return [];
  };

  const getDestOptions = () => {
    if (type === 'DEPOSITO') return accountsList.filter(a => a.type === 'EFECTIVO');
    if (type === 'TRANSFERENCIA') {
      if (!originId) return [];
      const origin = accountsList.find(a => a.id === originId);
      const isOriginBank = origin?.name.toLowerCase().includes('banco') || origin?.name.toLowerCase().includes('bóveda');
      const isOriginCash = origin?.name.toLowerCase().includes('efectivo') || origin?.name.toLowerCase().includes('caja');

      if (origin?.type === 'INVERSION') return accountsList.filter(a => a.id === bankAcc?.id);
      if (isOriginCash) return accountsList.filter(a => a.id === bankAcc?.id || a.type === 'FONDO');
      if (origin?.type === 'FONDO') return accountsList.filter(a => a.id === bankAcc?.id || a.id === cashAcc?.id);
      if (isOriginBank) return accountsList.filter(a => a.id !== originId);
    }
    return [];
  };

  const handleOriginChange = (newOriginId: string) => {
    setOriginId(newOriginId);
    setDestId(''); 
    setError(''); 
  };

  const renderBalancePreview = (accId: string, isOrigin: boolean, customAmount?: string) => {
    if (!accId) return null;
    const acc = accountsList.find(a => a.id === accId);
    if (!acc) return null;

    const numAmount = parseFloat(customAmount !== undefined ? customAmount : amount) || 0;
    if (numAmount === 0) return null;

    let finalBalance = currency(acc.balance);
    let isError = false;

    if (isOrigin) {
      if (acc.type === 'DEUDA') {
        finalBalance = finalBalance.subtract(numAmount);
        const limit = acc.creditLimit || acc.credit_limit || 0;
        if (Math.abs(finalBalance.value) > limit) isError = true;
      } else {
        finalBalance = finalBalance.subtract(numAmount);
        if (finalBalance.value < 0) isError = true;
      }
    } else {
      finalBalance = finalBalance.add(numAmount);
    }

    const isDebt = acc.type === 'DEUDA';
    let colorFinal = isOrigin ? 'text-rose-400' : (isDebt ? 'text-slate-200' : 'text-emerald-400');
    if (isError) colorFinal = 'text-red-500 font-bold';

    return (
      <div className="text-[9px] mt-1 text-slate-500 font-medium flex items-center justify-between px-1">
        <span>Actual: {formatMXN(Math.abs(acc.balance))}</span>
        <span className="opacity-50">→</span>
        <span>Final: <span className={colorFinal}>{formatMXN(Math.abs(finalBalance.value))}</span></span>
      </div>
    );
  };

  // ==========================================
  // HANDLER ALIGERADO: SOLO ENVÍA DATOS AL MOTOR
  // ==========================================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');

    try {
      // 1. Empacamos lo que el usuario escribió
      const payload = {
        type, isSplitDeposit, originId, destId, amount, concept, category,
        bankId: bankAcc?.id, cashId: cashAcc?.id, bankAmount, cashAmount
      };

      // 2. Lo enviamos al Motor para que haga la matemática, validaciones y guardado
      await processTreasuryTransaction(db, payload);
      
      // 3. Persistimos los cambios y cerramos
      await saveDB();
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Error al procesar la operación");
    } finally {
      setIsSaving(false);
    }
  };

  const getTitle = () => {
    if (type === 'DEPOSITO') return 'Ingreso de Capital';
    if (type === 'RETIRO') return 'Registro de Gasto';
    return 'Transferencia';
  };

  const totalSplitAmount = currency(parseFloat(bankAmount) || 0).add(parseFloat(cashAmount) || 0).value;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>, setter: any) => {
    setter(e.target.value);
    setError('');
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalCard}>
        
        <div className={styles.modalHeader}>
          <div className="flex items-center gap-2">
            {type === 'DEPOSITO' && <ArrowDownToLine className="w-5 h-5 text-emerald-400" />}
            {type === 'RETIRO' && <ArrowUpFromLine className="w-5 h-5 text-rose-400" />}
            {type === 'TRANSFERENCIA' && <ArrowRightLeft className="w-5 h-5 text-blue-400" />}
            <h2 className={styles.modalTitle}>{getTitle()}</h2>
          </div>
          <button onClick={onClose} className={styles.closeBtn}><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 animate-fade-in">
          
          {type === 'DEPOSITO' && (
            <div className="flex justify-between items-center pb-3 mb-1 border-b border-slate-800/60">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Modalidad de Ingreso</span>
              
              <label className="flex items-center cursor-pointer group">
                <div className="relative flex items-center">
                  <input type="checkbox" className="sr-only" checked={isSplitDeposit} onChange={() => setIsSplitDeposit(!isSplitDeposit)} />
                  <div className={`w-10 h-5 rounded-full transition-colors duration-300 ease-in-out ${isSplitDeposit ? 'bg-emerald-500' : 'bg-slate-700'}`}></div>
                  <div className={`absolute left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ease-in-out ${isSplitDeposit ? 'translate-x-5' : 'translate-x-0'}`}></div>
                </div>
                <span className={`ml-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${isSplitDeposit ? 'text-emerald-400' : 'text-slate-500'}`}>
                  Dividido
                </span>
              </label>
            </div>
          )}

          {type === 'DEPOSITO' && isSplitDeposit && (
            <div className="flex flex-col gap-4 animate-fade-in">
              <div className="flex gap-4 items-start">
                <div className="w-1/2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">A Bóveda (Banco)</label>
                  <div className="px-3 py-2.5 bg-slate-800/40 rounded-lg border border-slate-700/50 text-slate-300 text-sm flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-400" />
                    {bankAcc ? bankAcc.name : 'No detectado'}
                  </div>
                  {renderBalancePreview(bankAcc?.id, false, bankAmount)}
                </div>
                <div className="w-1/2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Monto ($)</label>
                  <input type="number" step="any" min="0" className={styles.input} value={bankAmount} onChange={e => handleAmountChange(e, setBankAmount)} placeholder="0.00" disabled={!bankAcc} />
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="w-1/2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">A Caja (Efectivo)</label>
                  <div className="px-3 py-2.5 bg-slate-800/40 rounded-lg border border-slate-700/50 text-slate-300 text-sm flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-emerald-400" />
                    {cashAcc ? cashAcc.name : 'No detectado'}
                  </div>
                  {renderBalancePreview(cashAcc?.id, false, cashAmount)}
                </div>
                <div className="w-1/2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Monto ($)</label>
                  <input type="number" step="any" min="0" className={styles.input} value={cashAmount} onChange={e => handleAmountChange(e, setCashAmount)} placeholder="0.00" disabled={!cashAcc} />
                </div>
              </div>

              <div className="flex justify-between items-center py-2 border-y border-slate-800/50 mt-1">
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Total a Registrar</span>
                <span className="text-emerald-400 font-bold text-xl tracking-tight">{formatMXN(totalSplitAmount)}</span>
              </div>
            </div>
          )}

          {type === 'TRANSFERENCIA' && (
            <div className="flex flex-col gap-4">
              <div className="flex gap-4 items-start">
                <div className="w-1/2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Origen</label>
                  <select className={styles.input} value={originId} onChange={e => handleOriginChange(e.target.value)} required>
                    <option value="">Selecciona...</option>
                    {getOriginOptions().map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                  </select>
                  {renderBalancePreview(originId, true)}
                </div>
                <div className="w-1/2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Destino</label>
                  <select className={styles.input} value={destId} onChange={e => { setDestId(e.target.value); setError(''); }} required disabled={!originId}>
                    <option value="">Selecciona...</option>
                    {getDestOptions().map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                  </select>
                  {renderBalancePreview(destId, false)}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Monto a Transferir</label>
                <input type="number" step="any" min="0.01" className={styles.input} value={amount} onChange={e => handleAmountChange(e, setAmount)} required placeholder="$0.00" />
              </div>
            </div>
          )}

          {((type === 'DEPOSITO' && !isSplitDeposit) || type === 'RETIRO') && (
            <div className="flex gap-4 items-start">
              <div className="w-1/2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  {type === 'DEPOSITO' ? 'A Cuenta' : 'De Cuenta'}
                </label>
                <select className={styles.input} value={type === 'DEPOSITO' ? destId : originId} onChange={e => type === 'DEPOSITO' ? setDestId(e.target.value) : handleOriginChange(e.target.value)} required>
                  <option value="">Selecciona...</option>
                  {(type === 'DEPOSITO' ? getDestOptions() : getOriginOptions()).map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                </select>
                {type === 'DEPOSITO' ? renderBalancePreview(destId, false) : renderBalancePreview(originId, true)}
              </div>
              <div className="w-1/2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Monto ($)</label>
                <input type="number" step="any" min="0.01" className={styles.input} value={amount} onChange={e => handleAmountChange(e, setAmount)} required placeholder="0.00" />
              </div>
            </div>
          )}

          <div className="flex gap-4 mt-1">
            <div className="w-1/2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Concepto <span className="text-rose-400">*</span></label>
              <input type="text" className={styles.input} value={concept} onChange={e => { setConcept(e.target.value); setError(''); }} required placeholder={type === 'DEPOSITO' ? "Ej. Nómina" : "Descripción"} />
            </div>
            <div className="w-1/2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Categoría <span className="text-slate-600 font-normal normal-case">(Opcional)</span></label>
              <input type="text" className={styles.input} value={category} onChange={e => setCategory(e.target.value)} placeholder={type === 'DEPOSITO' ? "Ej. Salario" : "Ej. Comida"} />
            </div>
          </div>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-2.5 flex items-start gap-2 mt-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <p className="text-rose-300 text-xs font-semibold leading-tight">{error}</p>
            </div>
          )}

          <button type="submit" disabled={isSaving || (type === 'DEPOSITO' && isSplitDeposit && totalSplitAmount <= 0)} className={`${styles.submitBtn} mt-2 flex justify-center items-center gap-2`}>
            {isSaving ? 'Procesando...' : 'Confirmar Operación'}
          </button>
        </form>
      </div>
    </div>
  );
};