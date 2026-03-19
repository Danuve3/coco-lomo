import type { AnimalType, TileColor } from '../engine/types';

export type TileThemeId = 'emoji' | 'original';

export interface TileThemeDefinition {
  readonly id: TileThemeId;
  readonly name: string;
  readonly hasImages: boolean;
  readonly imageBasePath?: string;
  /** Mapeo de AnimalType al nombre usado en los archivos de imagen */
  readonly animalFileNames?: Partial<Record<AnimalType, string>>;
  /** Mapeo de TileColor al sufijo de color usado en los archivos de imagen */
  readonly colorFileNames?: Partial<Record<TileColor, string>>;
}

export const TILE_THEMES: TileThemeDefinition[] = [
  { id: 'emoji', name: 'Emoji', hasImages: false },
  {
    id: 'original',
    name: 'Original',
    hasImages: true,
    imageBasePath: `${import.meta.env.BASE_URL}tile-themes/original`,
    animalFileNames: {
      RABBIT: 'rabbit',
      LEOPARD: 'tiger',
      EAGLE: 'eagle',
      BEAR: 'bear',
      DUCK: 'duck',
    },
    colorFileNames: {
      TERRACOTTA: 'brown',
      SAGE: 'green',
      INK: 'blue',
    },
  },
];

const STORAGE_KEY = 'cocolomo-tile-theme';

export function getTileThemeId(): TileThemeId {
  return (localStorage.getItem(STORAGE_KEY) as TileThemeId) ?? 'original';
}

export function setTileThemeId(id: TileThemeId): void {
  localStorage.setItem(STORAGE_KEY, id);
}

export function getAnimalImageUrl(themeId: TileThemeId, animal: AnimalType, color: TileColor): string | null {
  const theme = TILE_THEMES.find(t => t.id === themeId);
  if (!theme?.hasImages || !theme.imageBasePath) return null;
  const animalFile = theme.animalFileNames?.[animal] ?? animal.toLowerCase();
  const colorFile = theme.colorFileNames?.[color] ?? color.toLowerCase();
  return `${theme.imageBasePath}/${animalFile}-${colorFile}.webp`;
}
