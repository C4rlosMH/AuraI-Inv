import React, { useEffect, useState } from 'react';
import { Settings, ArrowDownToLine, ArrowUpFromLine, ArrowRightLeft, Eye, EyeOff, BellRing } from 'lucide-react';
import { useDB } from '../../db/DBContext';
import { usePortfolioStats } from '../../hooks/usePortfolioStats';
import { seedInitialCatalog } from '../../services/catalogService';
import { getRecentTransactions } from '../../services/ledgerService'; 
import { formatMXN } from '../../utils/formatters';
import { styles } from './Home.styles';
import { accounts } from '../../db/schema';

// Componentes
import { AccountDetails } from '../../components/details/AccountDetails';
import { DebtManager } from '../../components/details/DebtManager';
import { SummaryCard } from '../../components/home/SummaryCard';
import { Sparkline } from '../../components/home/Sparkline';
import { CreditSparkline } from '../../components/home/CreditSparkline';
import { TreasuryModal } from '../../components/home/TreasuryModal';
import { RecentTransactions } from '../../components/home/RecentTransactions';
import { InvestmentManager } from '../../components/details/InvestmentManager';
import { NetWorthChart } from '../../components/home/NetWorthChart';

type TreasuryType = 'DEPOSITO' | 'RETIRO' | 'TRANSFERENCIA' | null;

export default function Home() {
  const { db, saveDB, isReady } = useDB();
  const { stats } = usePortfolioStats();
  
  const [activeModal, setActiveModal] = useState<TreasuryType>(null);
  const [showBalance, setShowBalance] = useState(true);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [showSalaryAlert, setShowSalaryAlert] = useState(false);
  const [showDebtManager, setShowDebtManager] = useState(false);
  const [showInvManager, setShowInvManager] = useState(false);
  const [gbmId, setGbmId] = useState<string | null>(null);
  const [cryptoId, setCryptoId] = useState<string | null>(null);
  
  // Estado único para el historial reciente
  const [recentHistory, setRecentHistory] = useState<any[]>([]);

  useEffect(() => {
  const fetchInvIds = async () => {
    if (isReady && db) {
      const accs = await db.select().from(accounts);
      const gbm = accs.find((a: any) => a.type === 'INVERSION' && (a.name.toLowerCase().includes('inversion') || a.name.toLowerCase().includes('gbm')));
      const crypto = accs.find((a: any) => a.type === 'INVERSION' && (a.name.toLowerCase().includes('cripto') || a.name.toLowerCase().includes('crypto')));

      if (gbm) setGbmId(gbm.id);
      if (crypto) setCryptoId(crypto.id);
    }
  };
  fetchInvIds();
}, [isReady, db]);

  // Inicialización de la base de datos
  useEffect(() => {
    const initData = async () => {
      if (isReady && db) {
        await seedInitialCatalog(db, saveDB);
        window.dispatchEvent(new Event('db-update')); 
      }
    };
    initData();
  }, [isReady, db, saveDB]);

  // Carga reactiva de los últimos movimientos
  useEffect(() => {
    const fetchTransactions = async () => {
      if (isReady && db) {
        const txs = await getRecentTransactions(db, 5);
        setRecentHistory(txs);
      }
    };
    
    fetchTransactions(); // Carga inicial
    
    // Escuchamos actualizaciones en tiempo real
    window.addEventListener('db-update', fetchTransactions);
    return () => window.removeEventListener('db-update', fetchTransactions);
  }, [isReady, db]);

  // Alerta de pago semanal (Día de corte)
  useEffect(() => {
    const checkSalaryDay = () => {
      const today = new Date();
      const isSaturday = today.getDay() === 6; 
      const todayString = today.toDateString();
      const lastAlertDate = localStorage.getItem('lastSalaryAlert');

      if (isSaturday && lastAlertDate !== todayString) {
        setShowSalaryAlert(true);
      }
    };
    checkSalaryDay();
  }, []);

  const handleDismissAlert = () => {
    localStorage.setItem('lastSalaryAlert', new Date().toDateString());
    setShowSalaryAlert(false);
  };

  const handleAcceptAlert = () => {
    handleDismissAlert();
    setActiveModal('DEPOSITO'); // Esto abrirá el modal coherente con la opción de dividir
  };

  const handleSuccess = () => {
    setActiveModal(null);
    window.dispatchEvent(new Event('db-update')); 
  };

  // ==========================================
  // MOTOR DE CÁLCULO Y SEMÁFORO FINANCIERO
  // ==========================================
  const totalReturnPct = (stats.gbmReturnPct + stats.cryptoReturnPct) / 2;
  const deudaActual = Math.abs(stats.totalDebt);
  const creditoDisponible = stats.totalCreditLimit - deudaActual;
  const utilizacion = stats.totalCreditLimit > 0 ? (deudaActual / stats.totalCreditLimit) : 0;

  // NUEVO CÁLCULO: Liquidez pura (Banco + Efectivo + Fondos)
  const totalLiquidez = stats.bankBalance + stats.cashBalance + stats.funds.reduce((acc, f) => acc + f.balance, 0);

  let creditGraphColor = "#34d399"; 
  let creditTextColor = "text-emerald-400";

  if (utilizacion >= 0.70) {
    creditGraphColor = "#f43f5e"; 
    creditTextColor = "text-rose-400";
  } else if (utilizacion >= 0.30) {
    creditGraphColor = "#fb923c"; 
    creditTextColor = "text-orange-400";
  }

  return (
    <div className={styles.container}>
      
      {/* 1. Top Header */}
      <div className={styles.topHeader}>
        <div className={styles.greeting}>Mi Portafolio</div>
        <button className={styles.settingsButton}>
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {showSalaryAlert && (
        <div className="bg-blue-600/20 border border-blue-500/50 rounded-2xl p-4 mb-4 flex flex-col gap-3 animate-fade-in-down">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500/20 p-2 rounded-full text-blue-400">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm">¡Día de corte!</h3>
              <p className="text-blue-200 text-xs">¿Ya recibiste tu pago de esta semana?</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAcceptAlert} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold py-2 rounded-xl transition-colors">
              Sí, registrar ahora
            </button>
            <button onClick={handleDismissAlert} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold py-2 rounded-xl transition-colors border border-slate-700">
              Aún no / Omitir
            </button>
          </div>
        </div>
      )}

      {/* 2. Liquidez Principal y Patrimonio Secundario */}
      <div className={styles.netWorthContainer}>
        <p className={styles.headerLabel}>Liquidez Disponible</p>
        <div className={styles.netWorthWrapper}>
          <h1 className={styles.headerAmount}>
            {showBalance ? formatMXN(totalLiquidez) : '***'}
          </h1>
          <button onClick={() => setShowBalance(!showBalance)} className={styles.toggleButton}>
            {showBalance ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        
        {/* Patrimonio Neto Relegado a Indicador Secundario */}
        <div className="mt-3 flex items-center justify-center gap-2">
          <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
            Patrimonio Neto:
          </span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${stats.netWorth >= 0 ? 'bg-slate-800 text-slate-300' : 'bg-rose-500/10 text-rose-400'}`}>
            {showBalance ? formatMXN(stats.netWorth) : '***'}
          </span>
        </div>
      </div>

      {/* 3. Barra de Tesorería */}
      <div className={styles.quickActions}>
        <button className={styles.actionBtn} onClick={() => setActiveModal('DEPOSITO')}>
          <div className={styles.actionIconDeposit}><ArrowDownToLine className="w-5 h-5" /></div>
          <span className={styles.actionLabel}>Ingresar</span>
        </button>
        <button className={styles.actionBtn} onClick={() => setActiveModal('RETIRO')}>
          <div className={styles.actionIconWithdraw}><ArrowUpFromLine className="w-5 h-5" /></div>
          <span className={styles.actionLabel}>Gastar</span>
        </button>
        <button className={styles.actionBtn} onClick={() => setActiveModal('TRANSFERENCIA')}>
          <div className={styles.actionIconTransfer}><ArrowRightLeft className="w-5 h-5" /></div>
          <span className={styles.actionLabel}>Transferir</span>
        </button>
      </div>

      {/* 3.5 TARJETA DE EVOLUCIÓN PATRIMONIAL (NUEVA UBICACIÓN) */}
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-3xl p-5 mb-6 animate-fade-in">
        <div className="flex justify-between items-center mb-4">
          <span className="text-slate-400 text-[10px] font-bold tracking-widest uppercase">Evolución (7 Días)</span>
        </div>
        <NetWorthChart data={stats.historicalNetWorth || []} showBalance={showBalance} />
      </div>
      {/* 4. Cuentas Operativas y Crédito */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <SummaryCard 
          label="Bóveda (Banco)" 
          amount={stats.bankBalance} 
          color="#38bdf8"
          showBalance={showBalance} 
          history={stats.historyBank} 
          onClick={() => stats.bankId && setSelectedAccountId(stats.bankId)} 
        />
        <SummaryCard 
          label="Caja (Efectivo)" 
          amount={stats.cashBalance} 
          color="#94a3b8"
          showBalance={showBalance} 
          history={stats.historyCash}
          onClick={() => stats.cashId && setSelectedAccountId(stats.cashId)} 
        />

        {/* Tarjeta de Crédito Gamificada */}
        <div 
          onClick={() => setShowDebtManager(true)}
          className="col-span-2 bg-slate-900/40 hover:bg-slate-900/60 transition-colors pt-5 rounded-2xl border border-rose-900/30 flex flex-col justify-between overflow-hidden cursor-pointer"
        >
          <div className="px-4 z-10">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-slate-400 text-[10px] font-bold tracking-widest uppercase">Tarjetas de Crédito</span>
              <span className="text-[10px] font-bold text-slate-500">
                Límite: <span className="text-slate-300">{showBalance ? formatMXN(stats.totalCreditLimit) : '***'}</span>
              </span>
            </div>
            
            <div className="text-rose-400 text-2xl font-bold mb-2">
              {showBalance ? formatMXN(deudaActual) : '***'}
            </div>
            
            <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500">
              <span>Deuda: <span className="text-rose-400">{showBalance ? formatMXN(deudaActual) : '***'}</span></span>
              <span className="opacity-40">•</span>
              <span>Disp: <span className={`${creditTextColor} transition-colors duration-500`}>{showBalance ? formatMXN(creditoDisponible) : '***'}</span></span>
            </div>
          </div>
          
          <div className="mt-5 h-14 opacity-70 w-full">
            <CreditSparkline 
              data={stats.historyDebt.map(val => stats.totalCreditLimit + val)} 
              color={creditGraphColor} 
              totalLimit={stats.totalCreditLimit} 
            />
          </div>
        </div>
      </div>

      {/* 5. INVERSIONES BURSÁTILES */}
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-3xl p-5 mb-6">

        {/* CABECERA (Total del Portafolio) */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-slate-400 text-[10px] font-bold tracking-widest uppercase">Portafolio de Inversión</span>
              <button onClick={() => setShowInvManager(true)} className="p-1 text-slate-500 hover:text-emerald-400 transition-colors">
                <Settings className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="text-white text-2xl font-bold mt-1">
              {showBalance ? formatMXN(stats.totalInvested) : '***'}
            </div>
          </div>
          <div className={`px-2 py-1.5 rounded text-[11px] font-bold ${totalReturnPct >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
            {showBalance ? `${totalReturnPct > 0 ? '+' : ''}${totalReturnPct.toFixed(2)}%` : '***'}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* TARJETA GBM+ */}
          <div 
            onClick={() => gbmId && setSelectedAccountId(gbmId)} 
            className="bg-slate-900/50 pt-5 rounded-2xl border border-slate-700/50 flex flex-col justify-between overflow-hidden cursor-pointer hover:bg-slate-900/70 transition-colors"
          >
            {/* ... todo el contenido de la tarjeta GBM (se queda igual) ... */}
            <div className="px-4 z-10">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-slate-400 text-[10px] font-bold tracking-widest uppercase">GBM+</span>
                <span className={`text-[10px] font-bold ${stats.gbmReturnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {stats.gbmReturnPct > 0 ? '+' : ''}{stats.gbmReturnPct.toFixed(2)}%
                </span>
              </div>
              <div className="text-slate-100 text-xl font-bold mb-2">
                {showBalance ? formatMXN(stats.gbmBuyingPower + stats.gbmMarketValue) : '***'}
              </div>
              <div className="flex items-center gap-1.5 text-[9px] font-medium text-slate-500">
                <span>Disp: <span className="text-slate-300">{showBalance ? formatMXN(stats.gbmBuyingPower) : '***'}</span></span>
                <span className="opacity-40">•</span>
                <span>Inv: <span className="text-slate-300">{showBalance ? formatMXN(stats.gbmMarketValue) : '***'}</span></span>
              </div>
            </div>
            <div className="mt-6 h-20 opacity-90 w-full">
              <Sparkline data={stats.historyGBM} color={stats.gbmReturnPct >= 0 ? "#34d399" : "#f43f5e"} />
            </div>
          </div>

          {/* TARJETA CRYPTO */}
          <div 
            onClick={() => cryptoId && setSelectedAccountId(cryptoId)}
            className="bg-slate-900/50 pt-5 rounded-2xl border border-slate-700/50 flex flex-col justify-between overflow-hidden cursor-pointer hover:bg-slate-900/70 transition-colors"
          >
            {/* ... todo el contenido de la tarjeta Crypto (se queda igual) ... */}
            <div className="px-4 z-10">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-slate-400 text-[10px] font-bold tracking-widest uppercase">Crypto</span>
                <span className={`text-[10px] font-bold ${stats.cryptoReturnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {stats.cryptoReturnPct > 0 ? '+' : ''}{stats.cryptoReturnPct.toFixed(2)}%
                </span>
              </div>
              <div className="text-slate-100 text-xl font-bold mb-2">
                {showBalance ? formatMXN(stats.cryptoBuyingPower + stats.cryptoMarketValue) : '***'}
              </div>
              <div className="flex items-center gap-1.5 text-[9px] font-medium text-slate-500">
                <span>Disp: <span className="text-slate-300">{showBalance ? formatMXN(stats.cryptoBuyingPower) : '***'}</span></span>
                <span className="opacity-40">•</span>
                <span>Inv: <span className="text-slate-300">{showBalance ? formatMXN(stats.cryptoMarketValue) : '***'}</span></span>
              </div>
            </div>
            <div className="mt-6 h-20 opacity-90 w-full">
              <Sparkline data={stats.historyCrypto} color={stats.cryptoReturnPct >= 0 ? "#34d399" : "#f43f5e"} />
            </div>
          </div>
        </div>
      </div>

      {/* 6. Fondos de Ahorro y Reservas */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <span className="text-slate-400 text-[10px] font-bold tracking-widest uppercase ml-1">Mis Fondos</span>
        </div>
        {stats.funds.length === 0 ? (
          <div className="bg-slate-900/40 p-4 rounded-3xl border border-dashed border-slate-700 text-center text-slate-500 text-xs">
            Aún no tienes fondos registrados.
          </div>
        ) : (
          <div className={stats.funds.length === 1 ? "flex flex-col gap-4" : "grid grid-cols-2 gap-4"}>
            {stats.funds.map((fondo: any) => (
              <SummaryCard 
                key={fondo.id} 
                label={fondo.name} 
                amount={fondo.balance} 
                color="#3b82f6" 
                showBalance={showBalance} 
                history={fondo.history} 
                onClick={() => setSelectedAccountId(fondo.id)} 
              />
            ))}
          </div>
        )}
      </div>

      {/* 7. Historial de Movimientos Recientes */}
      <RecentTransactions transactions={recentHistory} />

      {/* ========================================== */}
      {/* CAPA DE MODALES (DIVULGACIÓN PROGRESIVA) */}
      {/* ========================================== */}
      
      {activeModal && (
        <TreasuryModal type={activeModal} onClose={() => setActiveModal(null)} onSuccess={handleSuccess} />
      )}
      
      {/* Historial Inteligente de Cuentas (Banco, Efectivo, Fondos, Inversiones) */}
      {selectedAccountId && (
        <AccountDetails accountId={selectedAccountId} onBack={() => setSelectedAccountId(null)} />
      )}
      
      {/* Gestor Avanzado de Créditos */}
      {showDebtManager && <DebtManager onBack={() => setShowDebtManager(false)} />}
      
      {/* Asientos de Apertura para Liquidez Bursátil */}
      {showInvManager && <InvestmentManager onBack={() => setShowInvManager(false)} />}

    </div>
  );
}