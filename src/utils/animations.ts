/** Añade una clase CSS y la quita tras la animación */
export function animateOnce(el: HTMLElement, className: string, durationMs = 400): void {
  el.classList.add(className);
  setTimeout(() => el.classList.remove(className), durationMs);
}

/** Anima la entrada de todas las fichas recién colocadas en un tablero */
export function animateTileEntries(boardEl: HTMLElement): void {
  const newTiles = boardEl.querySelectorAll<HTMLElement>('.tile--new');
  newTiles.forEach((tile, i) => {
    tile.style.animationDelay = `${i * 80}ms`;
    tile.classList.add('tile--dropping');
    setTimeout(() => {
      tile.classList.remove('tile--new', 'tile--dropping');
      tile.style.animationDelay = '';
    }, 600 + i * 80);
  });
}

/** Pulso visual en el tablero del bosque para indicar reorganización */
export function animateForestShuffle(forestEl: HTMLElement): void {
  animateOnce(forestEl, 'forest-board--shuffling', 700);
}

/** Resalta brevemente una zona del bosque */
export function highlightZone(zoneEl: HTMLElement): void {
  animateOnce(zoneEl, 'zone--highlight', 500);
}
