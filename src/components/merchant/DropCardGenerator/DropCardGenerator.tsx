import { useState, useRef, useMemo } from 'react';
import { m } from '@/lib/motion';
import type { Merchant } from '@/lib/types';
import { useArchiveStore } from '@/lib/store/archive.store';
import { useUIStore } from '@/lib/store/ui.store';
import { useStoreType } from '@/lib/hooks/use-store-type';
import {
  FIXTURE_VENDOR_PRODUCTS,
  FIXTURE_HOST_PRODUCTS,
  FIXTURE_DIGITAL_PRODUCTS,
  FIXTURE_STUDIO_PRODUCTS,
} from '@/lib/fixtures';
import { PALETTES } from '@/lib/constants/palettes';
import { TYPOGRAPHY_STACKS } from '@/lib/constants/typography';
import { SIGNATURES } from '@/lib/constants/signatures';
import styles from './DropCardGenerator.module.css';

// ─── Types ──────────────────────────────────────────────────────────────────

interface DropCardGeneratorProps {
  merchant: Merchant;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ─── Canvas helpers ─────────────────────────────────────────────────────────

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): void {
  const words = text.split(' ');
  let line = '';
  let currentY = y;
  for (const word of words) {
    const testLine = line + word + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && line !== '') {
      ctx.fillText(line.trim(), x, currentY);
      line = word + ' ';
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), x, currentY);
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function DropCardGenerator({ merchant }: DropCardGeneratorProps) {
  const { products } = useArchiveStore();
  const { addToast } = useUIStore();
  const st = useStoreType();

  const [headline, setHeadline] = useState('');
  const [format, setFormat] = useState<'square' | 'story'>('square');
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // ── Smart default per store type ──
  const smartDefault = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayName = DAYS[tomorrow.getDay()] ?? 'Friday';

    if (st.isCollector) {
      const liveCount = products.filter((p) => p.status === 'live').length;
      return `New drop. ${liveCount} pieces. ${dayName} 7pm.`;
    }
    if (st.isVendor) {
      const menuCount = FIXTURE_VENDOR_PRODUCTS.filter((p) => p.status === 'live').length;
      return `We're open ${dayName}. ${menuCount} items on the menu.`;
    }
    if (st.isHost) {
      const firstService = FIXTURE_HOST_PRODUCTS[0];
      return `3 slots just opened. ${firstService?.name ?? 'New availability'}.`;
    }
    if (st.isDigital) {
      const latest = [...FIXTURE_DIGITAL_PRODUCTS].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )[0];
      return `Now available: ${latest?.name ?? 'New product'}.`;
    }
    // studio
    const firstPkg = FIXTURE_STUDIO_PRODUCTS[0];
    return `Now available: ${firstPkg?.name ?? 'New package'}.`;
  }, [st.type, products]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Canvas rendering ──
  const renderPreview = () => {
    const src = canvasRef.current;
    const preview = previewCanvasRef.current;
    if (!src || !preview) return;
    const previewWidth = 300;
    const scale = previewWidth / src.width;
    preview.width = previewWidth;
    preview.height = Math.round(src.height * scale);
    const ctx = preview.getContext('2d');
    ctx?.drawImage(src, 0, 0, preview.width, preview.height);
  };

  const generateCard = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Ensure web fonts are loaded before drawing
    await document.fonts.ready;

    const { width, height } =
      format === 'square' ? { width: 1080, height: 1080 } : { width: 1080, height: 1920 };

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const palette = PALETTES.find((p) => p.id === merchant.store_config.palette) ?? PALETTES[0];
    const typStack =
      TYPOGRAPHY_STACKS.find((t) => t.id === merchant.store_config.typography) ??
      TYPOGRAPHY_STACKS[0];
    const sig =
      SIGNATURES.find((s) => s.id === merchant.store_config.signature) ?? SIGNATURES[0];

    // Step 1: Background fill
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, width, height);

    // Step 2: Noise texture overlay (film grain via pixel manipulation)
    const noiseData = ctx.getImageData(0, 0, width, height);
    for (let i = 0; i < noiseData.data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 30;
      noiseData.data[i] += noise;       // R — Uint8ClampedArray auto-clamps to 0–255
      noiseData.data[i + 1] += noise;   // G
      noiseData.data[i + 2] += noise;   // B
      // Alpha (i+3) unchanged
    }
    ctx.putImageData(noiseData, 0, 0);

    // Step 3: Accent gradient overlay (bottom-left glow)
    const gradient = ctx.createRadialGradient(
      width * 0.15,
      height * 0.85,
      0,
      width * 0.15,
      height * 0.85,
      width * 0.6,
    );
    gradient.addColorStop(0, hexToRgba(palette.accent, 0.25));
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Step 4: Wordmark — "Trove'a" top-left
    ctx.fillStyle = palette.fg;
    ctx.font = `300 ${Math.round(width * 0.04)}px 'Playfair Display', serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText("Trove\u2019a", width * 0.08, height * 0.08);

    // Step 5: Store name — prominent, upper-third
    ctx.fillStyle = palette.fg;
    ctx.font = `400 ${Math.round(width * 0.07)}px '${typStack.heading}', serif`;
    ctx.textAlign = 'left';
    wrapText(
      ctx,
      merchant.store_name,
      width * 0.08,
      height * 0.22,
      width * 0.84,
      Math.round(width * 0.085),
    );

    // Step 6: Headline — the announcement text
    ctx.fillStyle = hexToRgba(palette.fg, 0.85);
    ctx.font = `300 ${Math.round(width * 0.055)}px '${typStack.body}', sans-serif`;
    ctx.textAlign = 'left';
    wrapText(
      ctx,
      headline || smartDefault,
      width * 0.08,
      height * 0.45,
      width * 0.84,
      Math.round(width * 0.068),
    );

    // Step 7: Store URL — bottom-left, mono
    ctx.fillStyle = hexToRgba(palette.fg, 0.55);
    ctx.font = `400 ${Math.round(width * 0.025)}px 'DM Mono', monospace`;
    ctx.textAlign = 'left';
    ctx.fillText(`trovea.store/${merchant.handle}`, width * 0.08, height * 0.92);

    // Step 8: Signature tagline — bottom-right, italic
    ctx.fillStyle = hexToRgba(palette.accent, 0.7);
    ctx.font = `italic 300 ${Math.round(width * 0.022)}px 'Cormorant Garamond', serif`;
    ctx.textAlign = 'right';
    ctx.fillText(sig.tagline, width * 0.92, height * 0.92);

    // Step 9: Render scaled preview
    renderPreview();
  };

  // ── Handlers ──
  const handleGenerate = async () => {
    setIsGenerating(true);
    await generateCard();
    setIsGenerating(false);
    setHasGenerated(true);
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `trovea-drop-${merchant.handle}-${format}.png`;
    a.click();
  };

  const handleCopyCaption = () => {
    const sig =
      SIGNATURES.find((s) => s.id === merchant.store_config.signature) ?? SIGNATURES[0];
    const text = [
      headline || smartDefault,
      '',
      `Shop now: trovea.store/${merchant.handle}`,
      '',
      sig.tagline,
    ].join('\n');
    void navigator.clipboard.writeText(text).catch(() => {});
    addToast('Caption copied!', 'success');
  };

  // ── Render ──
  return (
    <div className={styles.generator}>
      <span className={styles.generatorLabel}>Drop Card</span>

      {/* Format selector */}
      <div>
        <span className={styles.fieldLabel}>Format</span>
        <div className={styles.formatRow} role="group" aria-label="Card format">
          <m.button
            className={`${styles.formatBtn} ${format === 'square' ? styles.formatBtnActive : ''}`}
            onClick={() => setFormat('square')}
            whileTap={{ scale: 0.97 }}
            aria-pressed={format === 'square'}
          >
            Square 1:1
          </m.button>
          <m.button
            className={`${styles.formatBtn} ${format === 'story' ? styles.formatBtnActive : ''}`}
            onClick={() => setFormat('story')}
            whileTap={{ scale: 0.97 }}
            aria-pressed={format === 'story'}
          >
            Story 9:16
          </m.button>
        </div>
      </div>

      {/* Headline input */}
      <div>
        <span className={styles.fieldLabel}>Headline</span>
        <input
          id="drop-headline"
          className={styles.headlineInput}
          type="text"
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          placeholder="e.g. New drop this Friday at 7pm"
          maxLength={120}
          aria-label="Drop announcement headline"
        />
        <m.button
          className={styles.defaultBtn}
          onClick={() => setHeadline(smartDefault)}
          whileTap={{ scale: 0.97 }}
          aria-label="Use smart default headline"
        >
          Use smart default →
        </m.button>
      </div>

      {/* Live preview */}
      <div className={styles.previewContainer}>
        <canvas
          ref={previewCanvasRef}
          className={styles.previewCanvas}
          style={{ display: hasGenerated ? 'block' : 'none' }}
          aria-label="Drop card preview"
        />
        {!hasGenerated && (
          <div className={styles.previewPlaceholder}>
            <span className="t-caps">Preview will appear here</span>
          </div>
        )}
      </div>

      {/* Hidden full-resolution canvas used for download */}
      <canvas ref={canvasRef} style={{ display: 'none' }} aria-hidden="true" />

      {/* Action buttons */}
      <div className={styles.actions}>
        <m.button
          className={styles.generateBtn}
          onClick={() => void handleGenerate()}
          disabled={isGenerating}
          whileTap={{ scale: 0.985 }}
          aria-label="Generate drop card"
        >
          {isGenerating ? 'Generating…' : 'Generate Card'}
        </m.button>
        <m.button
          className={styles.downloadBtn}
          onClick={handleDownload}
          disabled={!hasGenerated}
          whileTap={{ scale: 0.97 }}
          aria-label="Download PNG"
        >
          Download PNG ↓
        </m.button>
        <m.button
          className={styles.captionBtn}
          onClick={handleCopyCaption}
          disabled={!hasGenerated}
          whileTap={{ scale: 0.97 }}
          aria-label="Copy caption to clipboard"
        >
          Copy Caption
        </m.button>
      </div>
    </div>
  );
}
