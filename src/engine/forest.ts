import type { Tile, Zone, TileColor, AnimalType } from './types';
import { ANIMALS, COLORS, ZONE_COUNT, TILES_PER_ZONE, TILES_PER_TYPE, ZONE_CW, ZONE_CCW, ZONE_DIAG } from './constants';

/**
 * Crea el bosque inicial con el mazo completo de 120 fichas
 * (5 animales × 3 colores × 8 copias).
 * Las zonas visibles reciben ZONE_COUNT × TILES_PER_ZONE fichas;
 * el resto forma el mazo oculto (tilePile).
 */
export function createInitialForest(): { zones: Zone[]; pile: Tile[] } {
  const allTiles: Tile[] = [];

  for (const animal of ANIMALS) {
    for (const color of COLORS) {
      for (let i = 0; i < TILES_PER_TYPE; i++) {
        allTiles.push({ id: `${animal}_${color}_${i}`, animal, color });
      }
    }
  }

  shuffleArray(allTiles);

  const visibleCount = ZONE_COUNT * TILES_PER_ZONE;
  const zones = Array.from({ length: ZONE_COUNT }, (_, i) => ({
    id: i,
    tiles: allTiles.slice(i * TILES_PER_ZONE, (i + 1) * TILES_PER_ZONE),
  }));
  const pile = allTiles.slice(visibleCount);

  return { zones, pile };
}

/**
 * Repone las zonas desde el mazo hasta TILES_PER_ZONE fichas por zona.
 * Respeta las cantidades reales del mazo: no inventa fichas.
 */
/**
 * Normaliza cada zona a exactamente TILES_PER_ZONE fichas:
 * - Exceso (>4): las fichas sobrantes vuelven al final del mazo.
 * - Déficit (<4): se rellenan los huecos desde el mazo.
 * Las fichas no recogidas permanecen en su zona sin moverse.
 */
export function replenishZones(zones: Zone[], pile: Tile[]): { zones: Zone[]; pile: Tile[] } {
  let workingPile = [...pile];

  // Paso 1: devolver exceso al mazo
  const trimmed = zones.map(zone => {
    if (zone.tiles.length <= TILES_PER_ZONE) return zone;
    const excess = zone.tiles.slice(TILES_PER_ZONE);
    workingPile = [...workingPile, ...excess];
    return { ...zone, tiles: zone.tiles.slice(0, TILES_PER_ZONE) };
  });

  // Paso 2: rellenar huecos desde el mazo
  const newZones = trimmed.map(zone => {
    const needed = TILES_PER_ZONE - zone.tiles.length;
    if (needed <= 0 || workingPile.length === 0) return zone;
    const drawn = workingPile.splice(0, Math.min(needed, workingPile.length));
    return { ...zone, tiles: [...zone.tiles, ...drawn] };
  });

  return { zones: newZones, pile: workingPile };
}

/** Colores disponibles en el bosque (al menos una ficha de ese color en cualquier zona) */
export function getAvailableColors(zones: Zone[]): TileColor[] {
  const found = new Set<TileColor>();
  for (const zone of zones) {
    for (const tile of zone.tiles) found.add(tile.color);
  }
  return Array.from(found);
}

/** Colores presentes en una zona específica */
export function getColorsInZone(zone: Zone): TileColor[] {
  const found = new Set<TileColor>();
  for (const tile of zone.tiles) found.add(tile.color);
  return Array.from(found);
}

/** Fichas de un color específico dentro de una zona */
export function getTilesOfColorInZone(zone: Zone, color: TileColor): Tile[] {
  return zone.tiles.filter(t => t.color === color);
}

/**
 * Recoge todas las fichas del color dado SOLO de la zona indicada.
 * Retorna [nuevasZonas, fichasRecogidas].
 */
export function collectColorFromZone(zones: Zone[], zoneId: number, color: TileColor): [Zone[], Tile[]] {
  const collected: Tile[] = [];
  const newZones = zones.map(zone => {
    if (zone.id !== zoneId) return zone; // Otras zonas no cambian
    return {
      ...zone,
      tiles: zone.tiles.filter(tile => {
        if (tile.color === color) {
          collected.push(tile);
          return false;
        }
        return true;
      }),
    };
  });
  return [newZones, collected];
}

/** ¿Queda alguna ficha en el bosque? */
export function isForestEmpty(zones: Zone[]): boolean {
  return zones.every(z => z.tiles.length === 0);
}

/**
 * Calcula el conjunto de fichas a recoger al seleccionar una ficha.
 * Incluye la ficha seleccionada + fichas del mismo animal en la zona destino
 * según las reglas de movimiento del animal.
 */
export function computeCollection(zones: Zone[], selectedZone: number, selectedTile: Tile): Tile[] {
  const result: Tile[] = [selectedTile];
  const destZoneId = computeDestZone(zones, selectedZone, selectedTile);
  if (destZoneId === null) return result;

  const destZone = zones.find(z => z.id === destZoneId);
  if (!destZone) return result;

  for (const t of destZone.tiles) {
    if (t.id !== selectedTile.id && t.color === selectedTile.color) {
      result.push(t);
    }
  }
  return result;
}

/** Elimina fichas con los IDs dados de todas las zonas */
export function removeTilesByIds(zones: Zone[], ids: Set<string>): Zone[] {
  return zones.map(zone => ({
    ...zone,
    tiles: zone.tiles.filter(t => !ids.has(t.id)),
  }));
}

function computeDestZone(zones: Zone[], selectedZone: number, tile: Tile): number | null {
  const animal = tile.animal as AnimalType;
  switch (animal) {
    case 'RABBIT':  return ZONE_CW[selectedZone];
    case 'LEOPARD': return ZONE_CCW[selectedZone];
    case 'EAGLE':   return ZONE_DIAG[selectedZone];
    case 'BEAR':    return selectedZone;
    case 'DUCK': {
      let current = ZONE_CW[selectedZone];
      while (current !== selectedZone) {
        const zone = zones.find(z => z.id === current);
        if (zone?.tiles.some(t => t.animal === 'DUCK' && t.id !== tile.id)) {
          return current;
        }
        current = ZONE_CW[current];
      }
      return null; // sin más patos, solo se recoge la ficha seleccionada
    }
  }
}

function shuffleArray<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
