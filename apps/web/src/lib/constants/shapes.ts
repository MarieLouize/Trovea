import type { StoreShape } from '../types/merchant.types';

export interface ShapeDefinition {
  id: StoreShape;
  name: string;
  descriptor: string;
  vars: {
    '--sf-r-xs': string;
    '--sf-r-sm': string;
    '--sf-r-md': string;
    '--sf-r-lg': string;
    '--sf-r-xl': string;
    '--sf-r-pill': string;
    '--sf-shadow-softness': string;
  };
}

export const SHAPE_OPTIONS: ShapeDefinition[] = [
  {
    id: 'edge',
    name: 'Edge',
    descriptor: 'Brutalist, editorial',
    vars: {
      '--sf-r-xs':           '2px',
      '--sf-r-sm':           '3px',
      '--sf-r-md':           '5px',
      '--sf-r-lg':           '8px',
      '--sf-r-xl':           '10px',
      '--sf-r-pill':         '6px',
      '--sf-shadow-softness':'0',
    },
  },
  {
    id: 'form',
    name: 'Form',
    descriptor: 'Balanced, considered',
    vars: {
      '--sf-r-xs':           '6px',
      '--sf-r-sm':           '12px',
      '--sf-r-md':           '18px',
      '--sf-r-lg':           '24px',
      '--sf-r-xl':           '32px',
      '--sf-r-pill':         '50px',
      '--sf-shadow-softness':'1',
    },
  },
  {
    id: 'float',
    name: 'Float',
    descriptor: 'Airy, approachable',
    vars: {
      '--sf-r-xs':           '10px',
      '--sf-r-sm':           '18px',
      '--sf-r-md':           '26px',
      '--sf-r-lg':           '34px',
      '--sf-r-xl':           '44px',
      '--sf-r-pill':         '60px',
      '--sf-shadow-softness':'2',
    },
  },
  {
    id: 'bubble',
    name: 'Bubble',
    descriptor: 'Playful, expressive',
    vars: {
      '--sf-r-xs':           '14px',
      '--sf-r-sm':           '24px',
      '--sf-r-md':           '34px',
      '--sf-r-lg':           '44px',
      '--sf-r-xl':           '56px',
      '--sf-r-pill':         '9999px',
      '--sf-shadow-softness':'3',
    },
  },
];
