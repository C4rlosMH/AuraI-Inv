import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useCatalog } from '../../hooks/useCatalog';
import { styles } from './Catalog.styles';
import { AssetList } from '../../components/catalog/AssetList';
import { AddAccountModal } from '../../components/catalog/AddAccountModal';
import { AddAssetModal } from '../../components/catalog/AddAssetModal';

export default function Catalog() {
  const { assetsList } = useCatalog();
  
  // Estado para controlar los modales
  const [activeModal, setActiveModal] = useState<'ACCOUNT' | 'ASSET' | null>(null);

  // Manejador reactivo global
  const handleSuccess = () => {
    setActiveModal(null);
    window.dispatchEvent(new Event('db-update')); // Dispara la actualización a todos los hooks
  };

  return (
    <div className={styles.container}>
      
      <div>
        <h1 className={styles.headerTitle}>Catálogo</h1>
        <p className={styles.headerSubtitle}>Inventario de Instrumentos</p>
      </div>

      {/* Botón táctico para inyectar nuevas cuentas de liquidez, deuda o reservas */}
      <button 
        onClick={() => setActiveModal('ACCOUNT')}
        className="w-full py-3 mb-4 rounded-xl border border-dashed border-slate-700 text-slate-400 text-xs font-bold uppercase tracking-widest hover:bg-slate-800/50 transition-colors"
      >
        + Registrar Nueva Cuenta Bancaria / Reserva
      </button>

      {/* Inventario Bursátil y Cripto */}
      <div className={styles.sectionContainer}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Activos e Inversiones</h2>
          <button className={styles.addButton} onClick={() => setActiveModal('ASSET')}>
            <Plus className="w-5 h-5" />
          </button>
        </div>
        
        <AssetList assets={assetsList} />
      </div>

      {/* Renderizado condicional de Modales */}
      {activeModal === 'ACCOUNT' && (
        <AddAccountModal onClose={() => setActiveModal(null)} onSuccess={handleSuccess} />
      )}
      {activeModal === 'ASSET' && (
        <AddAssetModal onClose={() => setActiveModal(null)} onSuccess={handleSuccess} />
      )}

    </div>
  );
}