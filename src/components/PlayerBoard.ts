import type { GameState, Board, Tile, AnimalType } from '../engine/types';
import { tileHTML } from '../theme/index';
import { availableRowSpace } from '../engine/scoring';


export class PlayerBoard {
  private el: HTMLElement;
  private onSelectRow: (row: number) => void;
  private onSelectPendingTile?: (tile: Tile) => void;
  private onUndo?: () => void;
  private onConfirm?: () => void;
  private isAi: boolean;
  /** IDs de fichas ya renderizadas — para detectar fichas nuevas y animarlas */
  private renderedTileIds = new Set<string>();
  /** Copia de las fichas pendientes del último render, para lookup en listeners */
  private currentPendingTiles: Tile[] = [];

  constructor(
    container: HTMLElement,
    onSelectRow: (row: number) => void,
    isAi = false,
    onSelectPendingTile?: (tile: Tile) => void,
    onUndo?: () => void,
    onConfirm?: () => void,
  ) {
    this.el = container;
    this.onSelectRow = onSelectRow;
    this.isAi = isAi;
    this.onSelectPendingTile = onSelectPendingTile;
    this.onUndo = onUndo;
    this.onConfirm = onConfirm;
  }

  render(state: GameState): void {
    const board = this.isAi ? state.aiBoard : state.playerBoard;
    const isPlacePhase = !this.isAi && state.phase === 'PLAYER_PLACE';
    const isConfirmPhase = !this.isAi && state.phase === 'PLAYER_CONFIRM';
    const label = this.isAi ? 'Tablero de la IA' : 'Tu tablero';
    const score = this.isAi ? state.aiScore : state.playerScore;
    const lastAiRow = this.isAi && state.aiLastMove ? state.aiLastMove.row : -1;
    const acrobaticHint = state.expansionConfig.acrobatic ? state.expansionState.acrobaticTarget : null;
    this.currentPendingTiles = state.pendingTiles;

    // IDs de fichas en el tablero actual
    const currentTileIds = new Set<string>();
    for (const row of board) {
      for (const t of row) { if (t) currentTileIds.add(t.id); }
    }
    const newTileIds = new Set([...currentTileIds].filter(id => !this.renderedTileIds.has(id)));
    this.renderedTileIds = currentTileIds;

    this.el.innerHTML = `
      <div class="player-board ${this.isAi ? 'player-board--ai' : ''}" aria-label="${label}">
        <div class="player-board__header">
          <span class="player-board__title">${this.isAi ? '🤖 IA' : '🧑 Tú'}</span>
          <span class="player-board__score">${score.subtotal + score.extinctionBonus + score.acrobaticBonus} pts</span>
        </div>
        <div class="player-board__grid-wrapper">
          <div class="player-board__grid">
            ${Array.from({ length: 5 }, (_, row) =>
              this.rowHTML(board, row, isPlacePhase, lastAiRow, newTileIds, acrobaticHint),
            ).join('')}
          </div>
          <div class="player-board__row-hints">
            <div class="row-hint" title="Fila 1: +4 si las filas 1, 2 y 3 tienen la misma especie en la misma columna">4</div>
            <div class="row-hint row-hint--span" title="Filas 2 y 3: +3 por cada par de la misma especie en la misma columna">3</div>
            <div class="row-hint" title="Fila 4: puntos según grupos de misma especie (1/2/5/9/14)">1/2/5/9/14</div>
            <div class="row-hint" title="Fila 5: puntos según diversidad de especies (1/2/5/9/14)">1/2/5/9/14</div>
          </div>
        </div>
        ${!this.isAi ? this.pendingTilesBar(state) : ''}
        ${!this.isAi ? this.placementActionsHTML(state) : ''}
      </div>
    `;

    if (isPlacePhase) {
      this.attachRowListeners(board);
      this.attachPendingTileListeners();
    }
    if (isPlacePhase || isConfirmPhase) {
      this.attachPlacementActionListeners();
    }
  }

  private rowHTML(
    board: Board,
    row: number,
    isPlacePhase: boolean,
    highlightRow: number,
    newTileIds: Set<string>,
    acrobaticHint: AnimalType | null,
  ): string {
    const hasSpace = availableRowSpace(board, row) > 0;
    const isHighlighted = row === highlightRow;
    const isSelectable = isPlacePhase && hasSpace;

    const classes = [
      'board-row',
      isSelectable ? 'board-row--selectable' : '',
      isHighlighted ? 'board-row--highlight' : '',
      !hasSpace ? 'board-row--full' : '',
    ].filter(Boolean).join(' ');

    const cells = Array.from({ length: 5 }, (_, col) => {
      const tile = board[row][col];
      if (tile) {
        const isNew = newTileIds.has(tile.id) ? 'tile--new tile--dropping' : '';
        return tileHTML(tile.animal, tile.color, isNew);
      }
      if (row === 0 && col === 4 && acrobaticHint !== null) {
        return tileHTML(acrobaticHint, 'RED', 'tile--acrobatic-hint');
      }
      return `<div class="board-cell board-cell--empty"></div>`;
    }).join('');

    return `<div class="${classes}" data-row="${row}" role="${isSelectable ? 'button' : 'row'}"
      ${isSelectable ? 'tabindex="0" aria-label="Colocar en Fila ${row + 1}"' : ''}
    >${cells}</div>`;
  }

  private placementActionsHTML(state: GameState): string {
    if (state.phase === 'PLAYER_PLACE') {
      return `<div class="placement-actions">
        <button class="btn btn--ghost btn--sm" id="btn-undo-placement">↩ Deshacer</button>
      </div>`;
    }
    if (state.phase === 'PLAYER_CONFIRM') {
      return `<div class="placement-actions placement-actions--confirm">
        <button class="btn btn--ghost btn--sm" id="btn-undo-placement">↩ Deshacer</button>
        <button class="btn btn--primary btn--sm" id="btn-confirm-placement">✓ Confirmar turno</button>
      </div>`;
    }
    return '';
  }

  private attachPlacementActionListeners(): void {
    this.el.querySelector('#btn-undo-placement')?.addEventListener('click', () => this.onUndo?.());
    this.el.querySelector('#btn-confirm-placement')?.addEventListener('click', () => this.onConfirm?.());
  }

  private pendingTilesBar(state: GameState): string {
    if (state.phase !== 'PLAYER_PLACE' || state.pendingTiles.length === 0) return '';

    const selectedId = state.selectedPendingTile?.id ?? null;
    const tilesHtml = state.pendingTiles
      .map((t, i) => {
        const isSelected = t.id === selectedId;
        return `<div class="pending-tile${isSelected ? ' pending-tile--selected' : ''}"
          data-pending-idx="${i}"
          role="button" tabindex="0"
          aria-label="Seleccionar ${t.animal} ${t.color}"
          aria-pressed="${isSelected}"
        >${tileHTML(t.animal, t.color)}</div>`;
      })
      .join('');

    const instruction = state.pendingTiles.length === 1
      ? '↑ Elige una fila para colocarla'
      : selectedId !== null
        ? '↑ Ficha seleccionada — elige una fila'
        : 'Selecciona una ficha o elige una fila (se coloca la primera)';

    return `<div class="pending-bar">
      <span class="pending-bar__label">Por colocar (${state.pendingTiles.length}):</span>
      <div class="pending-bar__tiles">${tilesHtml}</div>
      <span class="pending-bar__instruction">${instruction}</span>
    </div>`;
  }

  private attachPendingTileListeners(): void {
    this.el.querySelectorAll<HTMLElement>('.pending-tile').forEach(el => {
      const idx = parseInt(el.dataset['pendingIdx'] ?? '0', 10);
      const handler = (): void => {
        const tile = this.currentPendingTiles[idx];
        if (tile) this.onSelectPendingTile?.(tile);
      };
      el.addEventListener('click', handler);
      el.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(); }
      });
    });
  }

  private attachRowListeners(_board: Board): void {
    this.el.querySelectorAll<HTMLElement>('.board-row--selectable').forEach(rowEl => {
      const row = parseInt(rowEl.dataset['row'] ?? '0', 10);

      rowEl.addEventListener('click', () => this.onSelectRow(row));
      rowEl.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.onSelectRow(row);
        }
      });
    });
  }
}
