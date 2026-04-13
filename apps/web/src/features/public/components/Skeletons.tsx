import styles from './Skeletons.module.css';

export function StorefrontSkeleton() {
  return (
    <div className={styles.skeletonStorefront}>
      <div className={styles.skeletonHero}>
        <div className={`${styles.shimmer} ${styles.skeletonHeroContent}`}>
          <div className={styles.skeletonBadge} />
          <div className={styles.skeletonTitle} />
          <div className={styles.skeletonTagline} />
          <div className={styles.skeletonTrustRow} />
        </div>
      </div>
      <div className={styles.skeletonNav}>
        <div className={styles.skeletonChip} />
        <div className={styles.skeletonChip} />
        <div className={styles.skeletonChip} />
      </div>
      <div className={styles.skeletonGrid}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className={styles.skeletonCard}>
            <div className={styles.skeletonMedia} />
            <div className={styles.skeletonBody}>
              <div className={styles.skeletonLine} />
              <div className={styles.skeletonPrice} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ItemDetailSkeleton() {
  return (
    <div className={styles.skeletonItemDetail}>
      <div className={styles.skeletonNavTop}>
        <div className={styles.skeletonCircle} />
        <div className={styles.skeletonTitleSm} />
        <div className={styles.skeletonCircle} />
      </div>
      <div className={styles.skeletonLayout}>
        <div className={styles.skeletonGallery} />
        <div className={styles.skeletonInfo}>
          <div className={styles.skeletonBadgeSmall} />
          <div className={styles.skeletonTitleLg} />
          <div className={styles.skeletonPriceMed} />
          <div className={styles.skeletonTextLong} />
          <div className={styles.skeletonCta} />
          <div className={styles.skeletonCta} />
        </div>
      </div>
    </div>
  );
}
