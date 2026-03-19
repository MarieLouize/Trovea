export interface ParsedItem {
  name: string;
  price: number;
  quantity: number;
  tags: string[];
  variantHints: string[];
  rawInput: string;
}

/**
 * Smart Paste Engine
 * Parses freeform WhatsApp-style product captions into structured data.
 * Never throws — handles all malformed input gracefully.
 */
export function parseSmartPaste(input: string): ParsedItem[] {
  if (!input || typeof input !== 'string') return [];

  const trimmed = input.trim();
  if (!trimmed) return [];

  // Split blocks by: double newline, '--', or numbered list markers (1. 2. etc.)
  const blocks = splitIntoBlocks(trimmed);

  return blocks
    .map(parseBlock)
    .filter((item): item is ParsedItem => item !== null);
}

function splitIntoBlocks(input: string): string[] {
  // Try numbered list first: lines starting with "1." "2." etc.
  const numberedPattern = /(?:^|\n)(?=\d+[\.\)]\s)/;
  const numberedBlocks = input.split(numberedPattern).map(b => b.trim()).filter(Boolean);

  if (numberedBlocks.length > 1) {
    // Strip leading "1. " markers
    return numberedBlocks.map(b => b.replace(/^\d+[\.\)]\s*/, '').trim());
  }

  // Try double newline
  const doubleNewlineBlocks = input.split(/\n{2,}/).map(b => b.trim()).filter(Boolean);
  if (doubleNewlineBlocks.length > 1) return doubleNewlineBlocks;

  // Try '--' separator
  const dashBlocks = input.split(/\n?--+\n?/).map(b => b.trim()).filter(Boolean);
  if (dashBlocks.length > 1) return dashBlocks;

  // Single block
  return [input];
}

function parseBlock(block: string): ParsedItem | null {
  if (!block.trim()) return null;

  const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  // ── NAME: First line, strip leading emoji ──
  const firstLine = lines[0];
  const nameRaw = stripLeadingEmoji(firstLine);
  const name = nameRaw.trim() || 'Unnamed Item';

  // ── PRICE: Currency regex across all lines ──
  let price = 0;
  const priceMatch = block.match(/[₦N]\s?[\d,]+(?:\.\d{1,2})?/i);
  if (priceMatch) {
    const priceStr = priceMatch[0].replace(/[₦N\s,]/gi, '').split('.')[0];
    const parsed = parseInt(priceStr, 10);
    if (!isNaN(parsed) && parsed > 0) price = parsed;
  }

  // ── QUANTITY: "available: 3" or "qty: 5" or "stock: 2" ──
  let quantity = 1;
  const qtyMatch = block.match(
    /(?:available|qty|quantity|stock|units?)[:\s]+(\d+)/i
  );
  if (qtyMatch?.[1]) {
    const q = parseInt(qtyMatch[1], 10);
    if (!isNaN(q) && q > 0) quantity = q;
  }

  // ── TAGS: Hashtags ──
  const tagMatches = block.matchAll(/#(\w+)/g);
  const tags = Array.from(tagMatches, m => m[1].toLowerCase()).filter(Boolean);

  // ── VARIANT HINTS ──
  const variantHints: string[] = [];
  const variantMatch = block.match(
    /(?:size|colour|color|available in|variants?)[:\s]+([^\n]+)/i
  );
  if (variantMatch?.[1]) {
    const rawVariants = variantMatch[1].split(',').map(v => v.trim()).filter(Boolean);
    variantHints.push(...rawVariants);
  }

  return {
    name,
    price,
    quantity,
    tags,
    variantHints,
    rawInput: block,
  };
}

function stripLeadingEmoji(text: string): string {
  // Remove leading emoji characters (Unicode ranges for common emoji)
  return text.replace(
    /^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FEFF}\u{1F000}-\u{1FFFF}\s]+/u,
    ''
  );
}