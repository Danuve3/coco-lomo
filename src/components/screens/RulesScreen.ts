import { setupLeavesCanvas, pickBgUrl } from '../../utils/leavesCanvas';

export class RulesScreen {
  private el: HTMLElement;
  private onBack: () => void;
  private cancelLeaves: (() => void) | null = null;

  constructor(container: HTMLElement, onBack: () => void) {
    this.el = container;
    this.onBack = onBack;
  }

  render(): void {
    this.cancelLeaves?.();
    this.cancelLeaves = null;

    const bgUrl = pickBgUrl(import.meta.env.BASE_URL);
    this.el.innerHTML = `
      <div class="rules-screen" style="background-image: url('${bgUrl}')">
        <div class="rules-screen__header">
          <button class="btn btn--ghost btn--sm" id="rules-back">← Volver</button>
          <h1 class="rules-screen__title">📖 Reglas de Coco Lomo</h1>
        </div>

        <div class="rules-screen__body">

          <section class="rules-section">
            <h2>Objetivo</h2>
            <p>Coloca fichas de animales en tu tablero personal (5×5) durante 6 rondas. Gana quien más puntos obtenga combinando animales según las reglas de puntuación.</p>
            <p>El juego consta de <strong>120 fichas</strong> repartidas en <strong>5 animales</strong> y <strong>3 colores</strong>: 8 fichas por cada combinación animal-color, lo que da 24 fichas por animal y 40 fichas por color.</p>
          </section>

          <section class="rules-section">
            <h2>Estructura de la partida</h2>
            <ul>
              <li><strong>6 rondas</strong>. El jugador inicial se establece en la configuración de la partida.</li>
              <li>Cada turno: <strong>recoges fichas</strong> del bosque → <strong>las colocas</strong> en una fila.</li>
            </ul>
          </section>

          <section class="rules-section">
            <h2>El bosque</h2>
            <p>El tablero de bosque tiene <strong>4 zonas</strong> con 4 fichas de animales por zona. Cada ficha tiene un animal y un color. Las 4 zonas forman una cuadrícula de 2×2.</p>
            <ol>
              <li>Elige cualquier ficha del bosque.</li>
              <li>Recoges la <strong>ficha elegida</strong> + todas las fichas del <strong>mismo color</strong> que la elegida de la zona que se corresponda según el animal escogido.</li>
              <li>Después de colocarlas en tu tablero, el bosque se repondrá con fichas aleatorias de las restantes.</li>
            </ol>
          </section>

          <section class="rules-section">
            <h2>Movimiento de animales</h2>
            <div class="animal-movements">
              <div class="animal-move-row">
                <span class="animal-move-icon">🐇</span>
                <div>
                  <strong>Conejo</strong><br/>
                  Se mueve <em>1 zona en sentido horario</em>.
                </div>
              </div>
              <div class="animal-move-row">
                <span class="animal-move-icon">🐆</span>
                <div>
                  <strong>Leopardo</strong><br/>
                  Se mueve <em>1 zona en sentido antihorario</em>.
                </div>
              </div>
              <div class="animal-move-row">
                <span class="animal-move-icon">🦅</span>
                <div>
                  <strong>Águila</strong><br/>
                  Se mueve <em>en diagonal</em>.
                </div>
              </div>
              <div class="animal-move-row">
                <span class="animal-move-icon">🐻</span>
                <div>
                  <strong>Oso</strong><br/>
                  <em>No se mueve</em>. Permanece en su zona.
                </div>
              </div>
              <div class="animal-move-row">
                <span class="animal-move-icon">🦆</span>
                <div>
                  <strong>Pato</strong><br/>
                  Avanza (horario) hasta la siguiente zona que tenga <em>otro pato</em>. Si no hay más patos, permanece en su zona.
                </div>
              </div>
            </div>
          </section>

          <section class="rules-section">
            <h2>Tu tablero personal</h2>
            <p>Cuadrícula de <strong>5 columnas × 5 filas</strong>. Las fichas se colocan de izquierda a derecha en la fila que elijas. Una vez colocadas, no se mueven.</p>
          </section>

          <section class="rules-section">
            <h2>Sistema de puntuación</h2>
            <div class="score-rules">

              <div class="score-rule score-rule--row0">
                <div class="score-rule__header">
                  <span class="score-rule__tag">Fila 1</span>
                  <span class="score-rule__pts">+4 pts / columna</span>
                </div>
                <p>Si el animal de Fila 1 coincide en especie con el <strong>par de filas 2 y 3</strong> de la misma columna → +4 pts por columna que cumpla.</p>
              </div>

              <div class="score-rule score-rule--rows12">
                <div class="score-rule__header">
                  <span class="score-rule__tag">Filas 2 y 3</span>
                  <span class="score-rule__pts">+3 pts / par</span>
                </div>
                <p>Cada par de fichas de la <strong>misma especie</strong> apiladas (Fila 2 y Fila 3, misma columna) → +3 pts. El color no importa.</p>
              </div>

              <div class="score-rule score-rule--row3">
                <div class="score-rule__header">
                  <span class="score-rule__tag">Fila 4</span>
                  <span class="score-rule__pts">Grupos</span>
                </div>
                <p>Puntuación por grupos de la misma especie (se puntúan independientemente):</p>
                <table class="mini-score-table">
                  <tr><th>Fichas</th><td>1</td><td>2</td><td>3</td><td>4</td><td>5</td></tr>
                  <tr><th>Puntos</th><td>1</td><td>2</td><td>5</td><td>9</td><td>14</td></tr>
                </table>
              </div>

              <div class="score-rule score-rule--row4">
                <div class="score-rule__header">
                  <span class="score-rule__tag">Fila 5</span>
                  <span class="score-rule__pts">Diversidad</span>
                </div>
                <p>Puntuación por número de <strong>especies distintas</strong> en la fila:</p>
                <table class="mini-score-table">
                  <tr><th>Especies</th><td>1</td><td>2</td><td>3</td><td>4</td><td>5</td></tr>
                  <tr><th>Puntos</th><td>1</td><td>2</td><td>5</td><td>9</td><td>14</td></tr>
                </table>
              </div>

              <div class="score-rule score-rule--color">
                <div class="score-rule__header">
                  <span class="score-rule__tag">Bonus Color</span>
                  <span class="score-rule__pts">+5 pts</span>
                </div>
                <p>Cada <strong>fila o columna completa</strong> (5 fichas) del mismo color → +5 pts. Aplica a ambos tableros.</p>
              </div>
            </div>
          </section>

          <section class="rules-section">
            <h2>Expansión A — Extinción 🌿</h2>
            <p>Al inicio se elige aleatoriamente un <strong>animal o color "en peligro"</strong>. Al final, el jugador con <strong>menos fichas</strong> de ese tipo en su tablero recibe <strong>+7 pts</strong>.</p>
          </section>

          <section class="rules-section">
            <h2>Expansión B — Acrobacia 🎪</h2>
            <p>Al inicio se elige aleatoriamente un <strong>animal acrobático</strong>. Si tienes ese animal en la <strong>última casilla de Fila 1</strong> (columna 5) al final, recibes <strong>+5 pts</strong>. La IA también puede obtenerlo.</p>
          </section>

        </div>

        <div class="rules-screen__footer">
          <button class="btn btn--primary" id="rules-back-bottom">← Volver al inicio</button>
        </div>
      </div>
    `;

    const screen = this.el.querySelector<HTMLElement>('.rules-screen');
    if (screen) this.cancelLeaves = setupLeavesCanvas(screen);

    this.el.querySelector('#rules-back')?.addEventListener('click', () => this.onBack());
    this.el.querySelector('#rules-back-bottom')?.addEventListener('click', () => this.onBack());
  }
}
