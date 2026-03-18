# 📖 Reglas de Coco Lomo

## Componentes

- **Tablero del bosque**: 6 zonas en anillo (Z1–Z6), con fichas de animales.
- **Fichas**: 30 fichas en total — 5 animales × 3 colores × 2 copias.
  - Animales: 🐇 Conejo, 🐆 Leopardo, 🦅 Águila, 🐻 Oso, 🦆 Pato
  - Colores: Terracota 🔴, Salvia 🟢, Tinta 🔵
- **Tablero personal**: cuadrícula 5×5 (5 filas, 5 columnas) por jugador.

---

## Estructura de la partida

- **6 rondas**.
- Orden de turno: primero el jugador humano, luego la IA.
- Al término de las 6 rondas se calcula la puntuación final.

---

## El turno del jugador

### 1. Recoger fichas del bosque

1. Elige **cualquier ficha** del tablero del bosque.
2. Recoges **TODAS las fichas del mismo COLOR** de todo el bosque (no solo de la zona elegida).
3. Esas fichas pasan a tu "mano" temporalmente.

### 2. Colocar fichas en tu tablero

1. Elige **una fila** de tu tablero personal (1–5).
2. Las fichas recogidas se colocan **de izquierda a derecha** en las posiciones libres de esa fila.
3. Si hay más fichas que espacios disponibles, las sobrantes se descartan.
4. Una vez colocadas, **las fichas no se mueven**.

### 3. Movimiento del bosque

Tras la recogida, **todas las fichas restantes** del bosque se mueven según el tipo de animal:

| Animal    | Regla de movimiento |
|-----------|---------------------|
| 🐇 Conejo  | +1 zona en sentido horario |
| 🐆 Leopardo | -1 zona en sentido antihorario |
| 🦅 Águila  | +2 zonas (salta una zona) en sentido horario |
| 🐻 Oso     | No se mueve. Permanece en su zona. |
| 🦆 Pato    | Avanza (horario) hasta la siguiente zona que contenga **otro pato**. Si no hay más patos, permanece. |

> **Zonas en anillo**: Z1→Z2→Z3→Z4→Z5→Z6→Z1 (sentido horario).
> El movimiento se calcula sobre el estado **antes** de aplicarlo (todos los animales se mueven simultáneamente).

---

## Sistema de puntuación

Las filas se numeran de arriba a abajo (Fila 1 = superior, Fila 5 = inferior).

### Fila 1 — Bonus del trío

> **+4 puntos por columna** donde la ficha de Fila 1 tenga la **misma especie** que el par de fichas de Filas 2 y 3 de esa columna.

Condición: `Fila1[col] = Fila2[col] = Fila3[col]` (misma especie, cualquier color).

### Filas 2 y 3 — Pares

> **+3 puntos** por cada par de fichas de **misma especie** en la misma columna (una en Fila 2, otra en Fila 3).

El color no importa. Aplica independientemente del bonus de Fila 1.

### Fila 4 — Grupos

> Puntuación por grupos de **misma especie** en la fila (grupos independientes):

| Fichas del grupo | Puntos |
|:---:|:---:|
| 1 | 1 |
| 2 | 2 |
| 3 | 5 |
| 4 | 9 |
| 5 | 14 |

Ejemplo: [🐇🐇🐇🐆🦅] → Conejos (3): 5 pts + Leopardo (1): 1 pt + Águila (1): 1 pt = **7 pts**.

### Fila 5 — Diversidad

> Puntuación por número de **especies distintas** presentes en la fila:

| Especies distintas | Puntos |
|:---:|:---:|
| 1 | 1 |
| 2 | 2 |
| 3 | 5 |
| 4 | 9 |
| 5 | 14 |

### Bonus de color

> **+5 puntos** por cada **fila o columna completa** (5 fichas) del mismo color.

Aplica a ambos tableros (jugador e IA). Una misma fila o columna solo puntúa una vez.

---

## Expansión A — Extinción 🌿

**Activación**: opcional, se activa antes de la partida.

**Regla**:
1. Al inicio de la partida, se selecciona aleatoriamente un **animal** o un **color** como objetivo de extinción.
2. Al final de la partida, el jugador con **menos fichas** de ese tipo en su tablero recibe **+7 puntos**.
3. Si hay empate en cantidad, **nadie recibe el bonus**.

El objetivo se muestra durante toda la partida para que ambos jugadores puedan planificar.

---

## Expansión B — Acrobacia 🎪

**Activación**: opcional, se activa antes de la partida.

**Regla**:
1. Al inicio de la partida, se selecciona aleatoriamente un **animal acrobático**.
2. Al final de la partida, si el jugador tiene ese animal en la **última casilla de Fila 1** (columna 5, fila 1), recibe **+5 puntos**.
3. Tanto el jugador como la IA pueden obtener este bonus independientemente.

---

## Fin de la partida

La partida termina tras **6 rondas completas** (o antes si el bosque queda vacío).

Se calcula la puntuación total:
```
Total = Fila1 + Filas2-3 + Fila4 + Fila5 + Bonus Color + Bonus Extinción + Bonus Acrobacia
```

El jugador con más puntos gana. En caso de empate, se declara empate.

---

## Notas sobre el tablero del bosque

En esta implementación digital:
- El bosque tiene **6 zonas** dispuestas en anillo.
- Al inicio, las 30 fichas se distribuyen aleatoriamente, 5 por zona.
- La **selección de fichas** se hace por color: al elegir cualquier ficha, se recogen TODAS las fichas de ese color del bosque entero.
- Si el bosque queda sin fichas de un color en concreto, ese color ya no es seleccionable.
