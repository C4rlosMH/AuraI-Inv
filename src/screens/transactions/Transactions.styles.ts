export const styles = {
  container: "p-5 flex flex-col gap-6 font-sans pb-24",
  
  // Header
  headerTitle: "text-3xl font-bold text-white tracking-tight mb-1",
  headerSubtitle: "text-slate-400 text-xs font-semibold tracking-wider uppercase",
  
  // Contenedor del Formulario
  formCard: "bg-slate-900/80 p-5 rounded-3xl border border-slate-800/50",
  
  // Selector de Tipo de Operación (Compra / Venta)
  typeSelectorGrid: "grid grid-cols-2 gap-3 mb-6",
  typeButtonBase: "py-3 rounded-xl font-bold text-sm text-center transition-colors border",
  typeBuyActive: "bg-emerald-500/20 text-emerald-400 border-emerald-500/50",
  typeSellActive: "bg-rose-500/20 text-rose-500 border-rose-500/50",
  typeInactive: "bg-slate-800/50 text-slate-500 border-transparent hover:bg-slate-800",

  // Grupos de Inputs
  inputGroup: "mb-4",
  label: "block text-slate-400 text-[10px] font-bold tracking-widest uppercase mb-2",
  select: "w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-3 outline-none focus:border-emerald-500 transition-colors appearance-none",
  input: "w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-3 outline-none focus:border-emerald-500 transition-colors placeholder-slate-600 font-mono",
  
  // Resumen y Botón de Ejecución
  summaryBox: "mt-6 p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50 flex justify-between items-center mb-6",
  summaryLabel: "text-slate-400 text-xs font-semibold",
  summaryValue: "text-white font-bold text-xl",
  
  submitButtonBuy: "w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-4 rounded-2xl transition-colors text-lg shadow-[0_0_20px_rgba(16,185,129,0.3)]",
  submitButtonSell: "w-full bg-rose-500 hover:bg-rose-400 text-white font-bold py-4 rounded-2xl transition-colors text-lg shadow-[0_0_20px_rgba(244,63,94,0.3)]",
  
  // Mensajes
  successMessage: "mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm rounded-xl text-center",
  errorMessage: "mt-4 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-500 text-sm rounded-xl text-center"
};