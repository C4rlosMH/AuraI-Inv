export const styles = {
  // Contenedores principales
  container: "p-5 flex flex-col gap-6 font-sans",
  
  // Top Header (NUEVO)
  topHeader: "flex justify-between items-center mb-2",
  greeting: "text-white font-bold text-xl tracking-tight",
  settingsButton: "p-2 bg-slate-900 rounded-full text-slate-400 hover:text-white transition-colors border border-slate-800/50",

  // Patrimonio Neto Centrado (ACTUALIZADO)
  netWorthContainer: "flex flex-col items-center justify-center text-center",
  headerLabel: "text-slate-400 text-xs font-semibold tracking-wider uppercase mb-1",
  netWorthWrapper: "flex items-center gap-3 ml-8", // ml-8 compensa el ancho del botón del ojo para centrar perfecto el texto
  headerAmount: "text-5xl font-bold text-white tracking-tight",
  toggleButton: "text-slate-500 hover:text-white p-2 transition-colors rounded-full",

  // --- MÓDULO DE TESORERÍA ---
  quickActions: "flex justify-between items-center bg-slate-900/40 p-4 rounded-3xl border border-slate-800/50",
  actionBtn: "flex flex-col items-center gap-2 w-1/3 cursor-pointer",
  actionIconDeposit: "p-3 rounded-full bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors",
  actionIconWithdraw: "p-3 rounded-full bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-colors",
  actionIconTransfer: "p-3 rounded-full bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors",
  actionLabel: "text-slate-400 text-[9px] font-bold tracking-widest uppercase",

  // Grid de Efectivo y Deuda
  grid2Cols: "grid grid-cols-2 gap-4",
  card: "bg-slate-900/80 p-4 rounded-3xl border border-slate-800/50",
  cardLabel: "text-slate-400 text-[10px] font-bold tracking-widest uppercase block mb-1",
  cardValuePos: "mt-1 mb-4 text-white font-semibold text-lg",
  cardValueNeg: "mt-1 mb-4 text-rose-500 font-semibold text-lg",

  // Sección Inversiones
  sectionCard: "bg-slate-900/80 p-5 rounded-3xl border border-slate-800/50",
  sectionHeader: "flex justify-between items-end mb-5",
  sectionTitle: "text-slate-400 text-[10px] font-bold tracking-widest uppercase mb-1 block",
  sectionAmount: "text-white font-semibold text-2xl",
  badge: "text-emerald-400 text-sm font-semibold mb-1 bg-emerald-400/10 px-2 py-1 rounded-lg",
  
  // Gráficas
  chartGrid: "grid grid-cols-2 gap-6 border-t border-slate-800 pt-4",
  chartLabel: "text-slate-500 text-[9px] font-bold uppercase tracking-wider block mb-2",

  // Modales
  modalOverlay: "fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center",
  modalCard: "bg-slate-900 w-full sm:w-[400px] rounded-t-3xl sm:rounded-3xl border-t border-slate-700/50 p-6 pb-12 sm:pb-6 shadow-2xl",
  modalHeader: "flex justify-between items-center mb-6",
  modalTitle: "text-white font-bold text-xl tracking-tight",
  closeBtn: "text-slate-400 hover:text-white p-2 bg-slate-800/80 rounded-full transition-colors",
  inputGroup: "mb-4",
  label: "block text-slate-400 text-[10px] font-bold tracking-widest uppercase mb-2",
  select: "w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-3 outline-none focus:border-blue-500 transition-colors appearance-none",
  input: "w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-4 outline-none focus:border-blue-500 transition-colors placeholder-slate-600 font-mono text-xl",
  submitBtn: "w-full mt-4 bg-white hover:bg-slate-200 text-slate-900 font-bold py-4 rounded-2xl transition-colors text-lg"
};