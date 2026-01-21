// Color palette for projects and clients
export const COLOR_PALETTE = [
  'text-indigo-600',
  'text-purple-600',
  'text-blue-600',
  'text-emerald-600',
  'text-rose-600',
  'text-amber-600',
  'text-cyan-600',
  'text-pink-600',
  'text-teal-600',
  'text-orange-600',
  'text-lime-600',
  'text-violet-600',
] as const;

export type ColorClass = typeof COLOR_PALETTE[number];

// Map Tailwind text colors to their background equivalents
export const textToBg = (textClass: string): string => {
  return textClass.replace('text-', 'bg-');
};

// Get the next available color (cycle through palette)
export function getNextColor(usedColors: string[]): string {
  for (const color of COLOR_PALETTE) {
    if (!usedColors.includes(color)) {
      return color;
    }
  }
  // If all colors used, cycle back
  return COLOR_PALETTE[usedColors.length % COLOR_PALETTE.length];
}

// Convert Tailwind color class to approximate hex value (for non-Tailwind contexts)
export function tailwindToHex(twClass: string): string {
  const colorMap: Record<string, string> = {
    'text-indigo-600': '#4f46e5',
    'text-purple-600': '#9333ea',
    'text-blue-600': '#2563eb',
    'text-emerald-600': '#059669',
    'text-rose-600': '#e11d48',
    'text-amber-600': '#d97706',
    'text-cyan-600': '#0891b2',
    'text-pink-600': '#db2777',
    'text-teal-600': '#0d9488',
    'text-orange-600': '#ea580c',
    'text-lime-600': '#65a30d',
    'text-violet-600': '#7c3aed',
    'text-slate-600': '#475569',
  };
  return colorMap[twClass] || '#475569';
}

// Get human-readable color name
export function getColorName(twClass: string): string {
  const nameMap: Record<string, string> = {
    'text-indigo-600': 'Indigo',
    'text-purple-600': 'Purple',
    'text-blue-600': 'Blue',
    'text-emerald-600': 'Emerald',
    'text-rose-600': 'Rose',
    'text-amber-600': 'Amber',
    'text-cyan-600': 'Cyan',
    'text-pink-600': 'Pink',
    'text-teal-600': 'Teal',
    'text-orange-600': 'Orange',
    'text-lime-600': 'Lime',
    'text-violet-600': 'Violet',
    'text-slate-600': 'Slate',
  };
  return nameMap[twClass] || 'Default';
}
