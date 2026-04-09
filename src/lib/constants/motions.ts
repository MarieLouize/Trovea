import type { StoreMotion } from '../types/merchant.types';

export interface MotionDefinition {
  id: StoreMotion;
  name: string;
  descriptor: string;
  durEnter: number;   // ms
  spring: { stiffness: number; damping: number; mass?: number };
  cardHoverLift: string; // CSS translateY + scale
  vars: {
    '--sf-dur-enter': string;
    '--sf-dur-exit': string;
    '--sf-card-hover-lift': string;
  };
}

export const MOTION_OPTIONS: MotionDefinition[] = [
  {
    id: 'still',
    name: 'Still',
    descriptor: 'No distraction',
    durEnter: 80,
    spring: { stiffness: 600, damping: 40 },
    cardHoverLift: 'none',
    vars: {
      '--sf-dur-enter':       '80ms',
      '--sf-dur-exit':        '60ms',
      '--sf-card-hover-lift': 'translateY(0) scale(1)',
    },
  },
  {
    id: 'precise',
    name: 'Precise',
    descriptor: 'Sharp, intentional',
    durEnter: 400,
    spring: { stiffness: 380, damping: 30 },
    cardHoverLift: 'translateY(-6px) scale(1.01)',
    vars: {
      '--sf-dur-enter':       '400ms',
      '--sf-dur-exit':        '240ms',
      '--sf-card-hover-lift': 'translateY(-6px) scale(1.01)',
    },
  },
  {
    id: 'fluid',
    name: 'Fluid',
    descriptor: 'Expressive, breathing',
    durEnter: 600,
    spring: { stiffness: 260, damping: 26 },
    cardHoverLift: 'translateY(-12px) scale(1.02)',
    vars: {
      '--sf-dur-enter':       '600ms',
      '--sf-dur-exit':        '360ms',
      '--sf-card-hover-lift': 'translateY(-12px) scale(1.02)',
    },
  },
  {
    id: 'cinematic',
    name: 'Cinematic',
    descriptor: 'Dramatic, show-stopping',
    durEnter: 900,
    spring: { stiffness: 200, damping: 28, mass: 1.2 },
    cardHoverLift: 'translateY(-16px) scale(1.03)',
    vars: {
      '--sf-dur-enter':       '900ms',
      '--sf-dur-exit':        '500ms',
      '--sf-card-hover-lift': 'translateY(-16px) scale(1.03)',
    },
  },
];
