export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  PUNISHED = 'PUNISHED', // Locked out state
  VICTORY = 'VICTORY',
  FAILURE = 'FAILURE',
}

export enum Grade {
  S = 'S',
  A = 'A',
  B = 'B',
  FAIL = '大失败',
}

export interface TargetZone {
  id: number;
  start: number; // Percentage 0-100
  width: number; // Percentage
  hit: boolean;
}

export interface GameConfig {
  duration: number; // seconds
  punishmentDuration: number; // ms
  cursorSpeed: number; // % per frame (approx)
}