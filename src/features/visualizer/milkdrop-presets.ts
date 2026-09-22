type PresetPack = {
  default?: { getPresets?: () => Record<string, unknown> };
  getPresets?: () => Record<string, unknown>;
};

function unpack(mod: PresetPack): Record<string, unknown> {
  const root = mod.getPresets ? mod : mod.default;
  if (root && typeof root.getPresets === "function") {
    return root.getPresets();
  }
  return {};
}

/** MilkDrop 2 shader packs (Butterchurn) — not the old MD1 set. */
export async function loadMilkdropPresets(): Promise<Record<string, unknown>> {
  const [main, extra] = await Promise.all([
    import("butterchurn-presets/lib/butterchurnPresets.min.js") as Promise<PresetPack>,
    import("butterchurn-presets/lib/butterchurnPresetsExtra.min.js") as Promise<PresetPack>,
  ]);
  return { ...unpack(main), ...unpack(extra) };
}
