import { useState, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import type { StoreConfig } from '@/lib/types/store-config.types';
import { useMerchantStore } from '@/lib/store/merchant.store';
import { useUIStore } from '@/lib/store/ui.store';
import ArchitectShell from '../../components/ArchitectShell/ArchitectShell';
import styles from './CustomizePage.module.css';

function configsEqual(a: StoreConfig, b: StoreConfig): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export default function CustomizePage() {
  const { handle } = useParams<{ handle: string }>();
  const { addToast } = useUIStore();
  const { merchant, setMerchant } = useMerchantStore();

  const [draftConfig, setDraftConfig] = useState<StoreConfig>(() => ({ ...merchant.store_config }));
  const [isPublishing, setIsPublishing] = useState(false);

  // Reset draft when the dev switcher changes the active merchant
  useEffect(() => {
    setDraftConfig({ ...merchant.store_config });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merchant.id]);

  const isDirty = !configsEqual(draftConfig, merchant.store_config);

  const handleUpdate = useCallback((patch: Partial<StoreConfig>) => {
    setDraftConfig((prev) => ({ ...prev, ...patch }));
  }, []);

  const handlePublish = useCallback(() => {
    setIsPublishing(true);
    setTimeout(() => {
      setMerchant({ ...merchant, store_config: draftConfig });
      addToast('Store updated!', 'success');
      setIsPublishing(false);
    }, 800);
  }, [merchant, draftConfig, setMerchant, addToast]);

  const handleDiscard = useCallback(() => {
    setDraftConfig({ ...merchant.store_config });
    addToast('Changes discarded', 'info');
  }, [merchant.store_config, addToast]);

  return (
    <div className={styles.page}>
      <ArchitectShell
        handle={handle ?? merchant.handle}
        draftConfig={draftConfig}
        isDirty={isDirty}
        isPublishing={isPublishing}
        onUpdate={handleUpdate}
        onPublish={handlePublish}
        onDiscard={handleDiscard}
      />
    </div>
  );
}
