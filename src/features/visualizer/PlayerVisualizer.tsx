import { VisualizerCanvas } from "./VisualizerCanvas";

type PlayerVisualizerProps = {
  reducedMotion: boolean;
  className?: string;
};

export function PlayerVisualizer({
  reducedMotion,
  className,
}: PlayerVisualizerProps) {
  return (
    <VisualizerCanvas
      variant="player"
      reducedMotion={reducedMotion}
      className={className}
    />
  );
}
