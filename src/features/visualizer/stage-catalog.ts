/** Full-window Visualizer Mode scenes — not the player soundbars. */

export type StageSceneId =
  | "ambience"
  | "tunnel"
  | "plasma"
  | "starfield"
  | "particles"
  | "vortex"
  | "ribbons";

export type StageScene = {
  id: StageSceneId;
  name: string;
  description: string;
};

export const DEFAULT_STAGE_SCENE: StageSceneId = "ambience";

export const STAGE_SCENES: StageScene[] = [
  {
    id: "ambience",
    name: "Ambience",
    description: "Drifting color clouds — the classic sit-back visualizer",
  },
  {
    id: "tunnel",
    name: "Tunnel",
    description: "Flying into a pulsing ring tunnel",
  },
  {
    id: "plasma",
    name: "Plasma",
    description: "Slow-moving color field",
  },
  {
    id: "starfield",
    name: "Starfield",
    description: "Stars rush toward you with the beat",
  },
  {
    id: "particles",
    name: "Particles",
    description: "Sparks that burst on bass hits",
  },
  {
    id: "vortex",
    name: "Vortex",
    description: "A spinning spiral of light",
  },
  {
    id: "ribbons",
    name: "Ribbons",
    description: "Wide flowing sheets of color",
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
