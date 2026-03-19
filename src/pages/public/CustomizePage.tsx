import { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import type { StoreConfig } from '@/lib/types/store-config.types';
import { FIXTURE_MERCHANT } from '@/lib/fixtures';
import { useUIStore } from '@/lib/store/ui.store';
import ArchitectShell from '../../components/ArchitectShell/ArchitectShell';
import styles from './CustomizePage.module.css';

function configsEqual(a: StoreConfig, b: StoreConfig): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export default function CustomizePage() {
  const { handle } = useParams<{ handle: string }>();
  const { addToast } = useUIStore();

  const initialConfig: StoreConfig = FIXTURE_MERCHANT.store_config;
  const [draftConfig, setDraftConfig] = useState<StoreConfig>({ ...initialConfig });

  const isDirty = !configsEqual(draftConfig, initialConfig);

  const handleUpdate = useCallback((patch: Partial<StoreConfig>) => {
    setDraftConfig((prev) => ({ ...prev, ...patch }));
  }, []);

  const handlePublish = useCallback(() => {
    // Phase 2: supabase.from('merchants').update({ store_config: draftConfig })
    addToast('Store updated!', 'success');
  }, [addToast]);

  const handleDiscard = useCallback(() => {
    setDraftConfig({ ...initialConfig });
    addToast('Changes discarded', 'info');
  }, [initialConfig, addToast]);

  return (
    <div className={styles.page}>
      <ArchitectShell
        handle={handle ?? FIXTURE_MERCHANT.handle}
        draftConfig={draftConfig}
        initialConfig={initialConfig}
        isDirty={isDirty}
        onUpdate={handleUpdate}
        onPublish={handlePublish}
        onDiscard={handleDiscard}
      />
    </div>
  );
}