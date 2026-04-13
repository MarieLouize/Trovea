import { Link } from 'react-router-dom';
import { m, staggerChild } from '@/lib/motion';
import { formatCurrencyFull } from '@/lib/utils/format';
import type { CardStyle } from '@/lib/types';

interface MiniCardProps {
  product: { id: string; name: string; price: number; images: string[]; status: string };
  handle: string;
  cardStyle: CardStyle;
}

export default function MiniCard({
  product,
  handle,
  cardStyle,
}: MiniCardProps) {
  return (
    <m.div variants={staggerChild}>
      <Link to={`/store/${handle}/item/${product.id}`} className={`sf-card sf-card-${cardStyle}`}>
        <div className="sf-card-image" style={{ aspectRatio: '1/1' }}>
          <img
            src={product.images[0] ?? `https://picsum.photos/seed/${product.id}/300/300`}
            alt={product.name}
            loading="lazy"
          />
          {product.status === 'sold_out' && (
            <span className="sf-card-status sf-card-status-sold">Sold</span>
          )}
        </div>
        <div className="sf-card-body">
          <p className="sf-card-name">{product.name}</p>
          <p className="sf-card-price">{formatCurrencyFull(product.price)}</p>
        </div>
      </Link>
    </m.div>
  );
}
