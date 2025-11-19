import { GameConfig } from './types';

export const CONFIG: GameConfig = {
  duration: 30,
  punishmentDuration: 2000,
  cursorSpeed: 0.8, // Speed of the cursor
};

export const TARGET_WIDTHS = [12, 8, 5]; // Easy, Medium, Hard widths in %

// Cyberpunk Color Palette
export const COLORS = {
  neonGreen: '#39ff14',
  neonRed: '#ff003c',
  neonCyan: '#00f3ff',
  darkBg: '#0a0a0a',
  punishBg: '#1a0505',
};