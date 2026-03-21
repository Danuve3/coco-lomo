import type { GameState, Zone, Tile } from '../engine/types';
import { tileHTML, colorName, animalName } from '../theme/index';

/**
 * Tablero del bosque: 4 grupos en anillo 2×2.
 *
 * Layout visual:
 *   [Z0] [Z1]
 *   [Z3] [Z2]
 *
 * Clockwise: 0 → 1 → 2 → 3 → 0
 */
export class ForestBoard {
  private el: HTMLElement;
  private onSelectTile: (zone: number, tile: Tile) => void;
  /** IDs de fichas ya renderizadas — para detectar fichas nuevas y animarlas */
  private renderedTileIds: Set<string> | null = null;

  constructor(container: HTMLElement, onSelectTile: (zone: number, tile: Tile) => void) {
    this.el = container;
    this.onSelectTile = onSelectTile;
  }

  render(state: GameState): void {
    const isPlayerSelect = state.phase === 'PLAYER_SELECT';
    const isAiTurn = state.phase === 'AI_TURN';
    const { selectedZone, selectedTile, previewTiles } = state;

    const previewIds = new Set(previewTiles.map(t => t.id));

    // Detectar fichas nuevas (null en el primer render → no animar nada)
    const currentTileIds = new Set<string>();
    for (const zone of state.forestZones) {
      for (const tile of zone.tiles) currentTileIds.add(tile.id);
    }
    const newTileIds = this.renderedTileIds !== null
      ? new Set([...currentTileIds].filter(id => !this.renderedTileIds!.has(id)))
      : new Set<string>();
    this.renderedTileIds = currentTileIds;

    this.el.innerHTML = `
      <div class="forest-board" aria-label="Tablero del bosque">
        <div class="forest-title">
          <span class="forest-title__icon">🌲</span>
          <span>Bosque</span>
        </div>
        <div class="forest-zones forest-zones--grid">
          ${state.forestZones.map(z =>
            this.zoneHTML(z, selectedZone, selectedTile, previewIds, newTileIds, isPlayerSelect, isAiTurn)
          ).join('')}
        </div>
        ${isPlayerSelect && selectedTile !== null && selectedZone !== null
          ? this.selectionBar(selectedZone, selectedTile)
          : ''}
      </div>
    `;

    this.attachListeners(state);
  }

  private zoneHTML(
    zone: Zone,
    selectedZone: number | null,
    selectedTile: Tile | null,
    previewIds: Set<string>,
    newTileIds: Set<string>,
    interactive: boolean,
    isAiTurn: boolean,
  ): string {
    const isSelected = zone.id === selectedZone;
    const hasSelection = selectedTile !== null;
    const zoneHasPreview = zone.tiles.some(t => previewIds.has(t.id));

    const zoneClasses = [
      'forest-zone',
      zone.tiles.length === 0 ? 'forest-zone--empty' : '',
      isSelected ? 'forest-zone--selected' : '',
      hasSelection && !zoneHasPreview ? 'forest-zone--dimmed' : '',
    ].filter(Boolean).join(' ');

    const cells: string[] = [];

    if (zone.tiles.length === 0) {
      cells.push(`<div class="forest-zone__slot--empty" aria-hidden="true"></div>`);
    }

    for (const tile of zone.tiles) {
      const isHighlighted = previewIds.has(tile.id);
      const isDimmedTile = hasSelection && !isHighlighted;

      let extraClass = '';
      if (isHighlighted || (isAiTurn && isHighlighted)) extraClass = 'tile--selected';
      else if (isDimmedTile) extraClass = 'tile--zone-dimmed';
      if (newTileIds.has(tile.id)) extraClass += (extraClass ? ' ' : '') + 'tile--entering';

      if (interactive) {
        cells.push(`<button
          class="tile-btn"
          data-zone="${zone.id}"
          data-tile-id="${tile.id}"
          aria-label="${tile.animal} ${tile.color} zona ${zone.id + 1}"
        >${tileHTML(tile.animal, tile.color, extraClass)}</button>`);
      } else {
        cells.push(tileHTML(tile.animal, tile.color, extraClass));
      }
    }

    const tilesHtml = cells.join('');

    return `<div class="${zoneClasses}" data-zone="${zone.id}">
      <span class="forest-zone__label">Grupo ${zone.id + 1}</span>
      <div class="forest-zone__tiles">${tilesHtml}</div>
    </div>`;
  }

  private selectionBar(zone: number, tile: Tile): string {
    return `
      <div class="forest-selection-bar">
        <span>Grupo ${zone + 1} · ${animalName(tile.animal)} · <strong>${colorName(tile.color)}</strong></span>
        <div class="forest-selection-bar__actions">
          <button class="btn btn--sm btn--ghost" id="forest-cancel">Cancelar</button>
          <button class="btn btn--sm btn--accent" id="forest-confirm">Confirmar recogida</button>
        </div>
      </div>
    `;
  }

  private attachListeners(state: GameState): void {
    if (state.phase !== 'PLAYER_SELECT') return;

    this.el.querySelectorAll<HTMLButtonElement>('.tile-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const zoneId = parseInt(btn.dataset['zone'] ?? '0', 10);
        const tileId = btn.dataset['tileId'];
        const zone = state.forestZones.find(z => z.id === zoneId);
        const tile = zone?.tiles.find(t => t.id === tileId);
        if (tile !== undefined && !isNaN(zoneId)) this.onSelectTile(zoneId, tile);
      });
    });

    const confirmBtn = this.el.querySelector<HTMLButtonElement>('#forest-confirm');
    const cancelBtn = this.el.querySelector<HTMLButtonElement>('#forest-cancel');

    confirmBtn?.addEventListener('click', () => {
      this.el.dispatchEvent(new CustomEvent('forest:confirm', { bubbles: true }));
    });
    cancelBtn?.addEventListener('click', () => {
      this.el.dispatchEvent(new CustomEvent('forest:cancel', { bubbles: true }));
    });
  }
}
