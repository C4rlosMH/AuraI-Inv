export const styles = {
  container: "p-5 flex flex-col gap-6 font-sans pb-24", // pb-24 evita que el Bottom Nav tape contenido
  
  // Header
  headerTitle: "text-3xl font-bold text-white tracking-tight mb-1",
  headerSubtitle: "text-slate-400 text-xs font-semibold tracking-wider uppercase",
  
  // Secciones (Cuentas y Activos)
  sectionContainer: "bg-slate-900/80 p-5 rounded-3xl border border-slate-800/50",
  sectionHeader: "flex justify-between items-center mb-4",
  sectionTitle: "text-white font-semibold text-lg",
  addButton: "p-2 bg-emerald-500/10 text-emerald-400 rounded-full hover:bg-emerald-500/20 transition-colors",
  icon: "w-5 h-5",
  
  // Listas
  list: "flex flex-col gap-3",
  listItem: "flex justify-between items-center p-3 bg-slate-800/40 rounded-2xl border border-slate-700/30",
  itemLeft: "flex items-center gap-3",
  itemAvatar: "w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-lg shadow-inner",
  itemName: "text-white font-medium text-sm",
  itemSub: "text-slate-400 text-[9px] font-bold tracking-widest uppercase mt-0.5",
  itemRight: "text-right",
  itemValue: "text-white font-semibold text-sm",
  itemDetail: "text-slate-500 text-[10px] mt-0.5"
};