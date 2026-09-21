declare module "butterchurn" {
  export type ButterchurnVisualizer = {
    loadPreset: (preset: unknown, blendTime?: number) => void | Promise<void>;
    setRendererSize: (width: number, height: number) => void;
    render: (opts?: {
      elapsedTime?: number;
      audioLevels?: {
        timeByteArray: Uint8Array;
        timeByteArrayL: Uint8Array;
        timeByteArrayR: Uint8Array;
      };
    }) => void;
  };

  const butterchurn: {
    createVisualizer: (
      context: AudioContext | null,
      canvas: HTMLCanvasElement,
      opts: { width: number; height: number; pixelRatio?: number },
    ) => ButterchurnVisualizer;
  };

  export default butterchurn;
}

declare module "butterchurn-presets/lib/butterchurnPresetsMD1.min.js" {
  const pack: {
    getPresets: () => Record<string, unknown>;
  };
  export default pack;
}
