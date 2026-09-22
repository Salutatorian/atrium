/** Full-window Visualizer Mode — MilkDrop 2 shader presets (Geiss / Winamp). */

export type StageSceneId =
  | "ambience"
  | "tunnel"
  | "plasma"
  | "starfield"
  | "particles"
  | "vortex"
  | "ribbons"
  | "hurricane"
  | "hyperspace"
  | "eggs"
  | "cubismo"
  | "wormhole"
  | "lasers";

export type StageScene = {
  id: StageSceneId;
  name: string;
  description: string;
  /** Exact key in the Butterchurn MilkDrop 2 packs. */
  milkdrop: string;
};

export const DEFAULT_STAGE_SCENE: StageSceneId = "ambience";

export const STAGE_SCENES: StageScene[] = [
  {
    id: "ambience",
    name: "Cauldron",
    description: "Geiss painterly wash — the MilkDrop 2 look",
    milkdrop: "Geiss - Cauldron - painterly (saturation remix)",
  },
  {
    id: "tunnel",
    name: "Tunnel",
    description: "Geiss layered tunnel",
    milkdrop: "Geiss - 3 layers (Tunnel Mix)",
  },
  {
    id: "plasma",
    name: "Maxawow",
    description: "Flexi / Martin / Geiss shader classic",
    milkdrop: "Flexi, martin + geiss - dedicated to the sherwin maxawow",
  },
  {
    id: "starfield",
    name: "Space",
    description: "Rovastar + Geiss snapshot of space",
    milkdrop: "Rovastar + Geiss - Snapshot Of Space (LSB mix)",
  },
  {
    id: "particles",
    name: "Brain Zoom",
    description: "Geiss close-up zoom",
    milkdrop: "Geiss - Brain Zoom 4",
  },
  {
    id: "vortex",
    name: "Tokamak",
    description: "Geiss tokamak — MilkDrop 2 signature",
    milkdrop: "Geiss - Tokamak Plus 2",
  },
  {
    id: "ribbons",
    name: "Mosaics",
    description: "Geiss myriad mosaics",
    milkdrop: "Geiss - Myriad Mosaics",
  },
  {
    id: "hurricane",
    name: "Hurricane",
    description: "Rovastar + Geiss hurricane nightmare",
    milkdrop: "Rovastar + Geiss - Hurricane Nightmare",
  },
  {
    id: "hyperspace",
    name: "Castle",
    description: "Martin — castle in the air",
    milkdrop: "martin - castle in the air",
  },
  {
    id: "eggs",
    name: "Diffusion",
    description: "Geiss reaction-diffusion",
    milkdrop: "Geiss - Reaction Diffusion 3",
  },
  {
    id: "cubismo",
    name: "Life",
    description: "Geiss Game of Life",
    milkdrop: "Geiss - Game of Life 3",
  },
  {
    id: "wormhole",
    name: "Wormhole",
    description: "Unchained + Rovastar wormhole pillars",
    milkdrop: "Unchained & Rovastar - Wormhole Pillars (Hall of Shadows mix)",
  },
  {
    id: "lasers",
    name: "Liquid Fire",
    description: "Cope — neverending red liquid fire",
    milkdrop: "Cope - The Neverending Explosion of Red Liquid Fire",
  },
];

export const STAGE_SCENE_IDS = STAGE_SCENES.map((s) => s.id) as [
  StageSceneId,
  ...StageSceneId[],
];

export function getStageScene(id: string): StageScene {
  return (
    STAGE_SCENES.find((s) => s.id === id) ??
    STAGE_SCENES.find((s) => s.id === DEFAULT_STAGE_SCENE)!
  );
}
