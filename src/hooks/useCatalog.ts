import { useState, useEffect, useCallback } from 'react';
import { useDB } from '../db/DBContext';
import { accounts, assets } from '../db/schema';

export const useCatalog = () => {
  const { db, isReady } = useDB();
  const [accountsList, setAccountsList] = useState<any[]>([]);
  const [assetsList, setAssetsList] = useState<any[]>([]);

  const loadCatalog = useCallback(async () => {
    if (!isReady || !db) return;
    
    const fetchedAccounts = await db.select().from(accounts);
    const fetchedAssets = await db.select().from(assets);
    
    setAccountsList(fetchedAccounts);
    setAssetsList(fetchedAssets);
  }, [isReady, db]);

  useEffect(() => {
    loadCatalog(); // Carga inicial
    
    window.addEventListener('db-update', loadCatalog);
    
    return () => window.removeEventListener('db-update', loadCatalog);
  }, [loadCatalog]);

  return { accountsList, assetsList, refreshCatalog: loadCatalog };
};