import React, { useState } from 'react';
import { Briefcase, Zap, BarChart2 } from 'lucide-react';
import Home from '../screens/home/Home';
import Catalog from '../screens/catalog/Catalog';
import Transactions from '../screens/transactions/Transactions';
import { styles } from './Layout.styles';

export default function Layout() {
  const [activeTab, setActiveTab] = useState<'home' | 'transactions' | 'catalog'>('home');

  return (
    <div className={styles.container}>
      
      <main className={styles.mainArea}>
        <div className={activeTab === 'home' ? 'block' : 'hidden'}>
          <Home />
        </div>
        
        <div className={activeTab === 'catalog' ? 'block' : 'hidden'}>
          <Catalog />
        </div>
        
        <div className={activeTab === 'transactions' ? 'block' : 'hidden'}>
          <Transactions />
        </div>
      </main>

      <nav className={styles.navBar}>
        <button 
          onClick={() => setActiveTab('home')}
          className={`${styles.navButton} ${activeTab === 'home' ? styles.navButtonActive : styles.navButtonInactive}`}
        >
          <Briefcase className="w-6 h-6 mb-1" />
          <span className={styles.navLabel}>Cuentas</span>
        </button>
        
        <button 
          onClick={() => setActiveTab('transactions')}
          className={`${styles.navButton} ${activeTab === 'transactions' ? styles.navButtonActive : styles.navButtonInactive}`}
        >
          <div className={styles.iconCenterWrapper}>
            {/* fill-current permite que el rayo se rellene de color al activarse */}
            <Zap className={`w-6 h-6 ${activeTab === 'transactions' ? 'fill-emerald-400' : ''}`} />
          </div>
        </button>

        <button 
          onClick={() => setActiveTab('catalog')}
          className={`${styles.navButton} ${activeTab === 'catalog' ? styles.navButtonActive : styles.navButtonInactive}`}
        >
          <BarChart2 className="w-6 h-6 mb-1" />
          <span className={styles.navLabel}>Catálogo</span>
        </button>
      </nav>
      
    </div>
  );
}