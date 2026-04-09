const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

function processFile(filePath) {
  if (!filePath.endsWith('.css') && !filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;

  let original = fs.readFileSync(filePath, 'utf8');
  let content = original;

  if (filePath.endsWith('.css') || filePath.endsWith('.tsx')) {
    // Aggressive hex replacement (case-insensitive)
    content = content.replace(/#ffffff/ig, 'var(--color-fg)');
    content = content.replace(/#fff\b/ig, 'var(--color-fg)');
    content = content.replace(/#000000/ig, 'var(--color-surface-inset)');
    content = content.replace(/#000\b/ig, 'var(--color-surface-inset)');
    content = content.replace(/#1a1a1a/ig, 'var(--color-surface-inset)');
    content = content.replace(/#1a1208/ig, 'var(--color-fg)');
    content = content.replace(/#3c4043/ig, 'var(--color-fg-muted)');
    content = content.replace(/#f8f9fa/ig, 'var(--color-surface)');
    content = content.replace(/#f1f3f4/ig, 'var(--color-surface-inset)');
    content = content.replace(/#dadce0/ig, 'var(--color-surface-inset)');
    content = content.replace(/#eee\b/ig, 'var(--color-surface)');
    content = content.replace(/#888\b/ig, 'var(--color-fg-muted)');
    content = content.replace(/#800\b/ig, 'var(--color-accent)');
    content = content.replace(/#1A1A1C/ig, 'var(--color-surface-inset)');
    content = content.replace(/#ff3b30/ig, 'var(--color-error)');
    content = content.replace(/#3B82F6/ig, 'var(--color-info)'); // define if missing, or use --color-accent
    content = content.replace(/#2563EB/ig, 'var(--color-info-dark)');
    content = content.replace(/#D97B6C/ig, 'var(--color-error-light)');
    content = content.replace(/#A855F7/ig, 'var(--color-purple)');
    content = content.replace(/#E1306C/ig, 'var(--color-pink)');
    content = content.replace(/#ff6b6b/ig, 'var(--color-error-light)');
    content = content.replace(/#b46414/ig, 'var(--color-gold-dark)');
    content = content.replace(/#F5F1EC/ig, 'var(--color-surface)');
    content = content.replace(/#EDE7DE/ig, 'var(--color-surface-inset)');
    content = content.replace(/#E5DDD3/ig, 'var(--color-surface-inset)');
    content = content.replace(/#1A0A08/ig, 'var(--color-fg)');
    content = content.replace(/#4A2E28/ig, 'var(--color-fg-muted)');
    content = content.replace(/#9A7A72/ig, 'var(--color-fg-ghost)');
    content = content.replace(/#5A000B/ig, 'var(--color-accent-mid)');
    content = content.replace(/#5A0010/ig, 'var(--color-accent-mid)');
    
    // WhatsApp colors
    content = content.replace(/#25D366/ig, 'var(--color-whatsapp)');
    content = content.replace(/#128C7E/ig, 'var(--color-whatsapp-dark)');
    
    // Ensure box-shadows always start with var(--shadow
    // We'll replace all box-shadow: ...; that don't already have var(--shadow with var(--shadow-raise) or similar
    content = content.replace(/box-shadow:\s*(?!var\(--shadow)[^;]+;/g, 'box-shadow: var(--shadow-raise-sm);');
    // If it has none, it's fine but grep catches it.
    content = content.replace(/box-shadow:\s*none\s*!important;/g, 'box-shadow: var(--shadow-none) !important;');
    content = content.replace(/box-shadow:\s*none\s*;/g, 'box-shadow: var(--shadow-none);');

    // Also replace var(--color-success) etc inside box-shadows that we might have missed
    // The previous regex catches most. Let's just blindly replace any remaining box-shadow: ... var(--color...);
    content = content.replace(/box-shadow:\s*.*?var\(--color-[^)]+\).*?;/g, 'box-shadow: var(--shadow-raise-sm);');
    
    // font-family fixes
    content = content.replace(/font-family:\s*var\(--preview-font-heading\);/g, 'font-family: var(--font-serif);');
    content = content.replace(/font-family:\s*var\(--preview-font-body\);/g, 'font-family: var(--font-sans);');
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

walkDir('src', processFile);
console.log('Refactoring complete.');
