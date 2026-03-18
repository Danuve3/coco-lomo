# Sistema de Theming — Coco Lomo

El sistema de fichas está diseñado para permitir personalización completa sin tocar la lógica del juego.

## Arquitectura

```
src/theme/
  animals.ts    → Define emojis, nombres y descripciones de cada animal
  colors.ts     → Define colores de fondo, texto y borde de las fichas
  index.ts      → Funciones de renderizado que leen de los dos módulos anteriores
```

La lógica del juego (`src/engine/`) nunca importa de `src/theme/`. Solo trabaja con tipos (`AnimalType`, `TileColor`). La capa de presentación importa de `src/theme/` para saber cómo mostrar cada tipo.

---

## 1. Sustituir emojis por SVGs o imágenes

En `src/theme/animals.ts`, cada animal tiene una propiedad `icon: string`.

**Actualmente:**
```ts
RABBIT: {
  icon: '🐇',
  // ...
}
```

**Para usar un SVG inline:**
```ts
RABBIT: {
  icon: `<svg viewBox="0 0 24 24" ...>...</svg>`,
  // ...
}
```

**Para usar una imagen:**
```ts
RABBIT: {
  icon: `<img src="/assets/rabbit.png" alt="Conejo" width="28" height="28" />`,
  // ...
}
```

Luego en `src/theme/index.ts`, la función `tileHTML` renderiza `${a.icon}` dentro del tile:
```ts
export function tileHTML(animal: AnimalType, color: TileColor, extraClass = ''): string {
  const a = ANIMAL_DEFS[animal];
  const c = COLOR_DEFS[color];
  return `<div class="tile ${extraClass}" ...>
    <span class="tile__icon">${a.icon}</span>
  </div>`;
}
```

Si necesitas un contenedor diferente para SVG vs emoji, modifica `tileHTML` aquí.

---

## 2. Cambiar la paleta de colores de las fichas

En `src/theme/colors.ts`:

```ts
export const COLOR_DEFS: Record<TileColor, ColorDefinition> = {
  TERRACOTTA: {
    bg: '#C75B39',    // ← Cambia aquí el color de fondo
    text: '#FFF3ED',  // ← Color del texto/icono
    border: '#E07050', // ← Borde de la ficha
    name: 'Terracota', // ← Nombre mostrado en UI
    cssVar: '--tile-terracotta',
  },
  // ...
};
```

Los cambios se aplican en tiempo de compilación (se insertan como style inline en cada tile).

Para un theming dinámico (cambio sin recompilar), puedes convertir `bg`, `text` y `border` a variables CSS y definirlas en `style.css`.

---

## 3. Añadir un nuevo animal

1. **`src/engine/types.ts`** — Añadir al union type:
   ```ts
   export type AnimalType = 'RABBIT' | 'LEOPARD' | 'EAGLE' | 'BEAR' | 'DUCK' | 'FOX';
   ```

2. **`src/engine/constants.ts`** — Añadir a la lista:
   ```ts
   export const ANIMALS: readonly AnimalType[] = [..., 'FOX'];
   ```

3. **`src/engine/movement.ts`** — Implementar la regla de movimiento:
   ```ts
   case 'FOX':
     dest = (zoneIdx + 3) % ZONE_COUNT; // Ejemplo: salta 3 zonas
     break;
   ```

4. **`src/theme/animals.ts`** — Añadir la definición visual:
   ```ts
   FOX: {
     type: 'FOX',
     icon: '🦊',
     name: 'Zorro',
     movement: 'Salta 3 zonas en sentido horario.',
     accentHint: '#E8A87C',
   },
   ```

5. **No es necesario modificar** la lógica de puntuación (opera sobre especies genéricas) ni el store ni los componentes de UI.

---

## 4. Añadir un nuevo color de ficha

1. **`src/engine/types.ts`**:
   ```ts
   export type TileColor = 'TERRACOTTA' | 'SAGE' | 'INK' | 'OCHRE';
   ```

2. **`src/engine/constants.ts`**:
   ```ts
   export const COLORS: readonly TileColor[] = [..., 'OCHRE'];
   ```

3. **`src/theme/colors.ts`**:
   ```ts
   OCHRE: {
     type: 'OCHRE',
     bg: '#D4A843',
     text: '#2A1800',
     border: '#E8BB55',
     name: 'Ocre',
     cssVar: '--tile-ochre',
   },
   ```

---

## 5. Theming completo (tema oscuro/claro)

Los colores globales de la app están en `src/style.css` bajo `:root`. Para un tema claro, añade:

```css
@media (prefers-color-scheme: light) {
  :root {
    --bg-0: #F5F0E8;
    --bg-1: #EDE8DC;
    /* ... */
  }
}
```

O crea un toggle manual modificando el atributo `data-theme` en `<html>`.

---

## Resumen de archivos a tocar por tipo de cambio

| Cambio                          | Archivos                                  |
|---------------------------------|-------------------------------------------|
| Sustituir emoji por SVG/imagen  | `src/theme/animals.ts` (+ `index.ts` si cambia estructura) |
| Cambiar colores de fichas       | `src/theme/colors.ts`                     |
| Añadir animal nuevo             | `types.ts`, `constants.ts`, `movement.ts`, `animals.ts` |
| Añadir color nuevo              | `types.ts`, `constants.ts`, `colors.ts`   |
| Cambiar paleta global de la app | `src/style.css`                           |
