// Core game types — no UI dependencies

export type AnimalType = 'RABBIT' | 'LEOPARD' | 'EAGLE' | 'BEAR' | 'DUCK';
export type TileColor = 'RED' | 'GREEN' | 'BLUE';

export interface Tile {
  readonly id: string;
  readonly animal: AnimalType;
  readonly color: TileColor;
}

export interface Zone {
  readonly id: number;
  tiles: Tile[];
}

/** board[row][col]: 5 filas × 5 columnas */
export type Board = (Tile | null)[][];

export type Difficulty = 'EASY' | 'NORMAL' | 'HARD' | 'EXTREME';

/** Quién mueve primero en cada ronda */
export type FirstPlayer = 'HUMAN' | 'AI' | 'RANDOM';

export interface ExpansionConfig {
  readonly extinction: boolean;
  readonly acrobatic: boolean;
}

export type ExtinctionTarget =
  | { readonly kind: 'animal'; readonly value: AnimalType }
  | { readonly kind: 'color'; readonly value: TileColor };

export interface ExpansionState {
  readonly extinctionTarget: ExtinctionTarget | null;
  readonly acrobaticTarget: AnimalType | null;
}

export type GamePhase =
  | 'PLAYER_SELECT'
  | 'PLAYER_PLACE'
  | 'PLAYER_CONFIRM'
  | 'AI_TURN'
  | 'GAME_END';

export interface RowScoreBreakdown {
  row0: number;
  rows12: number;
  row3: number;
  row4: number;
  colorBonus: number;
}

export interface BoardScore {
  breakdown: RowScoreBreakdown;
  subtotal: number;
  extinctionBonus: number;
  acrobaticBonus: number;
  total: number;
}

export interface GameConfig {
  readonly difficulty: Difficulty;
  readonly expansionConfig: ExpansionConfig;
  readonly firstPlayer: FirstPlayer;
}

export interface GameState {
  phase: GamePhase;
  round: number;
  humanPlaysFirst: boolean;
  forestZones: Zone[];
  playerBoard: Board;
  aiBoard: Board;
  playerScore: BoardScore;
  aiScore: BoardScore;
  /** Ficha específica que el jugador/IA ha seleccionado */
  selectedTile: Tile | null;
  selectedZone: number | null;
  /** Fichas que se recogerían si se confirma la selección (incluye selectedTile + adicionales) */
  previewTiles: Tile[];
  pendingTiles: Tile[];
  /** Ficha pendiente que el jugador ha seleccionado para colocar a continuación */
  selectedPendingTile: Tile | null;
  difficulty: Difficulty;
  expansionConfig: ExpansionConfig;
  expansionState: ExpansionState;
  aiLastMove: { zone: number; tile: Tile; row: number } | null;
  message: string;
  /** Fichas pendientes de salir al bosque (mazo oculto) */
  tilePile: Tile[];
  /** Snapshot del tablero antes de colocar fichas; permite deshacer */
  placementSnapshot: { playerBoard: Board; pendingTiles: Tile[] } | null;
}
