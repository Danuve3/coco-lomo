# 🌲 Coco Lomo

Adaptación digital del juego de mesa **Loco Momo**. Un juego de colocación de fichas de animales en un tablero personal, con puntuación basada en patrones por filas y columnas. 1 jugador vs IA.

## Características

- **PWA completa**: instalable en móvil y escritorio, funciona offline tras la primera carga
- **100% estático**: sin backend, sin base de datos
- **6 rondas** con tablero del bosque animado
- **IA en dos niveles**: Fácil (semi-aleatoria) y Difícil (greedy con evaluación de jugadas)
- **2 expansiones** opcionales: Extinción y Acrobacia
- **Diseño mobile-first** con tipografía distintiva (Fraunces + Sora)

## Stack técnico

- **Vite 5** + **TypeScript strict** (sin framework UI)
- **vite-plugin-pwa** — Service Worker + Web App Manifest automático
- CSS puro con custom properties

## Desarrollo

```bash
npm install
npm run dev        # Servidor de desarrollo en http://localhost:5173
```

## Build y despliegue

```bash
npm run build      # Compila TypeScript + genera dist/
npm run preview    # Vista previa del build en local
```

### GitHub Pages

1. Ejecuta `npm run build`
2. Sube el contenido de `dist/` a la rama `gh-pages` (o configura GitHub Actions)
3. Si el repositorio es un **project page** (`username.github.io/repo-name`), cambia en `vite.config.ts`:
   ```ts
   base: '/nombre-del-repo/',
   ```
4. Si es un **user page** (`username.github.io`), deja `base: './'`

### GitHub Actions (opcional)

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci && npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

## Iconos PWA

Los iconos placeholder en `public/icons/` son mínimos. Para iconos reales:

```bash
# Con sharp-cli (necesitas instalarlo)
npx sharp-cli -i public/icons/icon.svg -o public/icons/icon-192.png --width 192 --height 192
npx sharp-cli -i public/icons/icon.svg -o public/icons/icon-512.png --width 512 --height 512
```

O usa [squoosh.app](https://squoosh.app) para convertir el SVG manualmente.

## Estructura del proyecto

```
src/
  engine/          Motor puro del juego (sin dependencias de UI)
    types.ts       Tipos TypeScript
    constants.ts   Constantes del juego
    forest.ts      Lógica del tablero del bosque
    movement.ts    Reglas de movimiento de animales
    scoring.ts     Sistema de puntuación
    ai.ts          IA (fácil y difícil)
    game.ts        Orquestador de estado
  store/
    gameStore.ts   Estado global + acciones async
  theme/           Sistema de theming (ver THEMING.md)
    animals.ts
    colors.ts
    index.ts
  components/      Componentes de UI
    ForestBoard.ts
    PlayerBoard.ts
    ScorePanel.ts
    screens/
      StartScreen.ts
      GameScreen.ts
      RulesScreen.ts
      ResultScreen.ts
  utils/
    animations.ts
    dom.ts
  main.ts          Punto de entrada
  style.css        Estilos globales
public/
  icons/           Iconos PWA
```

## Decisiones de diseño

- **Tablero del bosque**: 6 zonas en anillo. Sentido horario: Z1→Z2→Z3→Z4→Z5→Z6→Z1.
- **Fichas**: 30 fichas (5 animales × 3 colores × 2 copias), distribuidas 5 por zona al inicio.
- **Filas del tablero**: indexadas 0-4. La "Fila 1" del reglamento = índice 0.
- Consulta [RULES.md](./RULES.md) para las reglas completas.
- Consulta [THEMING.md](./THEMING.md) para personalizar fichas y colores.
