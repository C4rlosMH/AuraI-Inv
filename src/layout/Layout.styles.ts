export const styles = {
  container: "min-h-screen bg-slate-950 flex flex-col font-sans",
  
  // Área principal con scroll independiente y padding inferior para evitar el menú
  mainArea: "flex-1 overflow-y-auto pb-24", 
  
  // Barra de Navegación Inferior (Fija)
  navBar: "fixed bottom-0 w-full bg-slate-900 border-t border-slate-800 flex justify-around items-center h-16 pb-safe z-50",
  
  // Botones del Menú
 navButton: "flex flex-col items-center justify-center w-full h-full transition-colors cursor-pointer",
  navButtonActive: "text-emerald-400",
  navButtonInactive: "text-slate-500 hover:text-slate-400",
  
  // Iconografía
  iconMain: "text-xl",
  iconCenterWrapper: "bg-slate-800 p-2 rounded-full mb-1 shadow-inner border border-slate-700/50",
  iconCenter: "text-xl",
  navLabel: "text-[10px] font-medium mt-1"
};