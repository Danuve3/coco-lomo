import type { Zone, Tile } from './types';
import { ZONE_COUNT, ZONE_CW, ZONE_CCW, ZONE_DIAG } from './constants';

/**
 * Aplica el movimiento de todas las fichas restantes del bosque.
 * Cada ficha se mueve según las reglas de su animal.
 *
 * Layout:  [Z0] [Z1]
 *          [Z2] [Z3]
 *
 * Reglas:
 *  - RABBIT:  avanza una zona en sentido horario
 *  - LEOPARD: avanza una zona en sentido antihorario
 *  - EAGLE:   salta a la zona diagonal
 *  - BEAR:    permanece en su zona
 *  - DUCK:    avanza en horario hasta la siguiente zona que tenga otro pato.
 *             Si no hay más patos, permanece.
 */
export function applyForestMovement(zones: Zone[]): Zone[] {
  const newTiles: Tile[][] = Array.from({ length: ZONE_COUNT }, () => []);

  for (let zoneIdx = 0; zoneIdx < zones.length; zoneIdx++) {
    for (const tile of zones[zoneIdx].tiles) {
      let dest: number;

      switch (tile.animal) {
        case 'RABBIT':
          dest = ZONE_CW[zoneIdx];
          break;
        case 'LEOPARD':
          dest = ZONE_CCW[zoneIdx];
          break;
        case 'EAGLE':
          dest = ZONE_DIAG[zoneIdx];
          break;
        case 'BEAR':
          dest = zoneIdx;
          break;
        case 'DUCK':
          dest = findDuckDestination(zoneIdx, zones);
          break;
      }

      newTiles[dest].push(tile);
    }
  }

  return Array.from({ length: ZONE_COUNT }, (_, i) => ({
    id: i,
    tiles: newTiles[i],
  }));
}

/**
 * Destino de un pato en zoneIdx: busca en sentido horario la siguiente zona
 * que, en el estado original, tenga al menos un pato.
 */
function findDuckDestination(zoneIdx: number, originalZones: Zone[]): number {
  let current = ZONE_CW[zoneIdx];
  while (current !== zoneIdx) {
    if (originalZones[current].tiles.some(t => t.animal === 'DUCK')) {
      return current;
    }
    current = ZONE_CW[current];
  }
  return zoneIdx; // sin otros patos → permanece
}
