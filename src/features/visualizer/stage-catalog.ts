/** Full-window Visualizer Mode scenes — MilkDrop presets (Winamp / WMP). */

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
  /** Exact key in the MilkDrop 1 Butterchurn pack. */
  milkdrop: string;
};

export const DEFAULT_STAGE_SCENE: StageSceneId = "ambience";

export const STAGE_SCENES: StageScene[] = [
  {
    id: "ambience",
    name: "Planet",
    description: "Geiss classic — drifting world, the old Windows visualizer feel",
    milkdrop: "Geiss - Planet 1",
  },
  {
    id: "tunnel",
    name: "Tunnel",
    description: "Flying into a twisting Escher tunnel",
    milkdrop: "Aderrasi - Contortion (Escher\u2032s Tunnel Mix)",
  },
  {
    id: "plasma",
    name: "Feedback",
    description: "Slow painterly feedback field",
    milkdrop: "Geiss - Feedback 2",
  },
  {
    id: "starfield",
    name: "Starfield",
    description: "Ripples a million miles from earth",
    milkdrop: "Krash & Rovastar - A Million Miles from Earth (Ripple Mix)",
  },
  {
    id: "particles",
    name: "Sparks",
    description: "Beat-reactive spark trails",
    milkdrop: "Eo.S. - spark C_Phat_Jester_Mix_v2",
  },
  {
    id: "vortex",
    name: "Spiral",
    description: "Hypnotic spiral movement",
    milkdrop: "Krash + Illusion - Spiral Movement",
  },
  {
    id: "ribbons",
    name: "Mosaic",
    description: "Flowing mosaic waves",
    milkdrop: "Rovastar + Fvese - Mosaic Waves",
  },
  {
    id: "hurricane",
    name: "Hurricane",
    description: "Geiss storm — spinning weather",
    milkdrop: "Geiss - Hurricane",
  },
  {
    id: "hyperspace",
    name: "Hyperspace",
    description: "Rovastar jump to light speed",
    milkdrop: "Rovastar - Hyperspace",
  },
  {
    id: "eggs",
    name: "Eggs",
    description: "Geiss organic cells",
    milkdrop: "Geiss - Eggs",
  },
  {
    id: "cubismo",
    name: "Cubes",
    description: "Geiss cubism — tumbling blocks",
    milkdrop: "Geiss - El Cubismo",
  },
  {
    id: "wormhole",
    name: "Wormhole",
    description: "Through a long-haul warp tunnel",
    milkdrop: "Rovastar - A Million Miles From Earth (Wormhole Mix)",
  },
  {
    id: "lasers",
    name: "Lasers",
    description: "Show lasers cutting the dark",
    milkdrop: "GreatWho - Lasershow",
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
