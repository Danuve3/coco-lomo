import type { GameState, Difficulty, AnimalType, TileColor, Board, RowScoreBreakdown } from '../engine/types';

export interface GameRecord {
  id: string;
  date: string;
  result: 'win' | 'loss' | 'tie';
  difficulty: Difficulty;
  expansions: { extinction: boolean; acrobatic: boolean };
  humanFirst: boolean;
  rounds: number;
  player: { total: number; subtotal: number; extinctionBonus: number; acrobaticBonus: number };
  ai: { total: number; subtotal: number; extinctionBonus: number; acrobaticBonus: number };
  // v2: richer stats
  playerBreakdown?: RowScoreBreakdown;
  aiBreakdown?: RowScoreBreakdown;
  playerAnimalCounts?: Partial<Record<AnimalType, number>>;
  playerColorCounts?: Partial<Record<TileColor, number>>;
}

export interface AggregatedStats {
  total: number;
  wins: number;
  losses: number;
  ties: number;
  winRate: number;
  avgPlayerScore: number;
  avgAiScore: number;
  bestPlayerScore: number;
  worstPlayerScore: number;
  byDifficulty: Record<Difficulty, { total: number; wins: number }>;
  // v2
  currentStreak: { type: 'win' | 'loss' | 'tie'; count: number } | null;
  bestWinStreak: number;
  avgScoreDiff: number;
  biggestWin: number;
  biggestLoss: number;
  firstPlayer: { total: number; wins: number };
  secondPlayer: { total: number; wins: number };
  withExtinction: { total: number; wins: number; bonusCount: number };
  withAcrobatic: { total: number; wins: number; bonusCount: number };
  avgBreakdown: RowScoreBreakdown | null;
  animalFrequency: Partial<Record<AnimalType, number>>;
  colorFrequency: Partial<Record<TileColor, number>>;
  recentScores: Array<{ player: number; ai: number }>;
}

const STORAGE_KEY = 'cocolomo-stats';

export function getRecords(): GameRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as GameRecord[]) : [];
  } catch {
    return [];
  }
}

function countBoardTiles(board: Board): {
  animals: Partial<Record<AnimalType, number>>;
  colors: Partial<Record<TileColor, number>>;
} {
  const animals: Partial<Record<AnimalType, number>> = {};
  const colors: Partial<Record<TileColor, number>> = {};
  for (const row of board) {
    for (const tile of row) {
      if (tile) {
        animals[tile.animal] = (animals[tile.animal] ?? 0) + 1;
        colors[tile.color] = (colors[tile.color] ?? 0) + 1;
      }
    }
  }
  return { animals, colors };
}

export function saveGameResult(state: GameState): void {
  const { playerScore, aiScore } = state;
  const result: 'win' | 'loss' | 'tie' =
    playerScore.total > aiScore.total ? 'win' :
    playerScore.total < aiScore.total ? 'loss' : 'tie';

  const { animals, colors } = countBoardTiles(state.playerBoard);

  const record: GameRecord = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    date: new Date().toISOString(),
    result,
    difficulty: state.difficulty,
    expansions: { ...state.expansionConfig },
    humanFirst: state.humanPlaysFirst,
    rounds: state.round,
    player: {
      total: playerScore.total,
      subtotal: playerScore.subtotal,
      extinctionBonus: playerScore.extinctionBonus,
      acrobaticBonus: playerScore.acrobaticBonus,
    },
    ai: {
      total: aiScore.total,
      subtotal: aiScore.subtotal,
      extinctionBonus: aiScore.extinctionBonus,
      acrobaticBonus: aiScore.acrobaticBonus,
    },
    playerBreakdown: { ...state.playerScore.breakdown },
    aiBreakdown: { ...state.aiScore.breakdown },
    playerAnimalCounts: animals,
    playerColorCounts: colors,
  };

  const records = getRecords();
  records.push(record);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function getAggregatedStats(): AggregatedStats | null {
  const records = getRecords();
  if (records.length === 0) return null;

  const wins = records.filter(r => r.result === 'win').length;
  const losses = records.filter(r => r.result === 'loss').length;
  const ties = records.filter(r => r.result === 'tie').length;
  const total = records.length;

  const avgPlayerScore = Math.round(records.reduce((s, r) => s + r.player.total, 0) / total);
  const avgAiScore = Math.round(records.reduce((s, r) => s + r.ai.total, 0) / total);
  const bestPlayerScore = Math.max(...records.map(r => r.player.total));
  const worstPlayerScore = Math.min(...records.map(r => r.player.total));

  const byDifficulty = {} as AggregatedStats['byDifficulty'];
  for (const diff of ['EASY', 'HARD', 'EXTREME'] as const) {
    const sub = records.filter(r => r.difficulty === diff);
    byDifficulty[diff] = { total: sub.length, wins: sub.filter(r => r.result === 'win').length };
  }

  // Racha actual
  let currentStreak: AggregatedStats['currentStreak'] = null;
  if (records.length > 0) {
    const lastType = records[records.length - 1].result;
    let count = 0;
    for (let i = records.length - 1; i >= 0; i--) {
      if (records[i].result === lastType) count++;
      else break;
    }
    currentStreak = { type: lastType, count };
  }

  // Mejor racha de victorias
  let bestWinStreak = 0;
  let curWinStreak = 0;
  for (const r of records) {
    if (r.result === 'win') {
      curWinStreak++;
      if (curWinStreak > bestWinStreak) bestWinStreak = curWinStreak;
    } else {
      curWinStreak = 0;
    }
  }

  // Diferencias
  const diffs = records.map(r => r.player.total - r.ai.total);
  const avgScoreDiff = Math.round(diffs.reduce((a, b) => a + b, 0) / total);
  const winDiffs = diffs.filter((_, i) => records[i].result === 'win');
  const lossDiffs = diffs.filter((_, i) => records[i].result === 'loss');
  const biggestWin = winDiffs.length > 0 ? Math.max(...winDiffs) : 0;
  const biggestLoss = lossDiffs.length > 0 ? Math.abs(Math.min(...lossDiffs)) : 0;

  // Primero vs segundo
  const firstGames = records.filter(r => r.humanFirst);
  const secondGames = records.filter(r => !r.humanFirst);
  const firstPlayer = { total: firstGames.length, wins: firstGames.filter(r => r.result === 'win').length };
  const secondPlayer = { total: secondGames.length, wins: secondGames.filter(r => r.result === 'win').length };

  // Expansiones
  const extGames = records.filter(r => r.expansions.extinction);
  const acrGames = records.filter(r => r.expansions.acrobatic);
  const withExtinction = {
    total: extGames.length,
    wins: extGames.filter(r => r.result === 'win').length,
    bonusCount: extGames.filter(r => r.player.extinctionBonus > 0).length,
  };
  const withAcrobatic = {
    total: acrGames.length,
    wins: acrGames.filter(r => r.result === 'win').length,
    bonusCount: acrGames.filter(r => r.player.acrobaticBonus > 0).length,
  };

  // Breakdown promedio (solo registros v2)
  const v2Records = records.filter(r => r.playerBreakdown != null);
  let avgBreakdown: RowScoreBreakdown | null = null;
  if (v2Records.length > 0) {
    const n = v2Records.length;
    avgBreakdown = {
      row0: Math.round(v2Records.reduce((s, r) => s + (r.playerBreakdown!.row0 ?? 0), 0) / n),
      rows12: Math.round(v2Records.reduce((s, r) => s + (r.playerBreakdown!.rows12 ?? 0), 0) / n),
      row3: Math.round(v2Records.reduce((s, r) => s + (r.playerBreakdown!.row3 ?? 0), 0) / n),
      row4: Math.round(v2Records.reduce((s, r) => s + (r.playerBreakdown!.row4 ?? 0), 0) / n),
      colorBonus: Math.round(v2Records.reduce((s, r) => s + (r.playerBreakdown!.colorBonus ?? 0), 0) / n),
    };
  }

  // Frecuencia de animales y colores
  const animalTotals: Partial<Record<AnimalType, number>> = {};
  const colorTotals: Partial<Record<TileColor, number>> = {};
  const v2Count = v2Records.length;
  if (v2Count > 0) {
    for (const r of v2Records) {
      for (const [k, v] of Object.entries(r.playerAnimalCounts ?? {})) {
        const a = k as AnimalType;
        animalTotals[a] = (animalTotals[a] ?? 0) + (v ?? 0);
      }
      for (const [k, v] of Object.entries(r.playerColorCounts ?? {})) {
        const c = k as TileColor;
        colorTotals[c] = (colorTotals[c] ?? 0) + (v ?? 0);
      }
    }
    // Convertir a promedio por partida (1 decimal)
    for (const k of Object.keys(animalTotals) as AnimalType[]) {
      animalTotals[k] = Math.round((animalTotals[k]! / v2Count) * 10) / 10;
    }
    for (const k of Object.keys(colorTotals) as TileColor[]) {
      colorTotals[k] = Math.round((colorTotals[k]! / v2Count) * 10) / 10;
    }
  }

  // Últimas 15 partidas para sparkline (orden cronológico)
  const recentScores = records.slice(-15).map(r => ({ player: r.player.total, ai: r.ai.total }));

  return {
    total,
    wins,
    losses,
    ties,
    winRate: Math.round((wins / total) * 100),
    avgPlayerScore,
    avgAiScore,
    bestPlayerScore,
    worstPlayerScore,
    byDifficulty,
    currentStreak,
    bestWinStreak,
    avgScoreDiff,
    biggestWin,
    biggestLoss,
    firstPlayer,
    secondPlayer,
    withExtinction,
    withAcrobatic,
    avgBreakdown,
    animalFrequency: animalTotals,
    colorFrequency: colorTotals,
    recentScores,
  };
}

export function clearStats(): void {
  localStorage.removeItem(STORAGE_KEY);
}
