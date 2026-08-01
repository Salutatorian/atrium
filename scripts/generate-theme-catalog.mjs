import fs from "node:fs";

const dark = [
  ["ink-amber", "Ink Amber", "dark charcoal with gold", "dark", ["dark", "warm"], "#191815", "#23211c", "#efe7d7", "#c8bba4", "#8f8574", "#e2b714", "#f0c62a", "#1a1608"],
  ["nordic-night", "Nordic Night", "cool arctic dark", "dark", ["dark", "cool"], "#1b222a", "#242d38", "#e6edf5", "#b7c4d4", "#8392a6", "#88c0d0", "#9fd0dd", "#132029"],
  ["violet-room", "Violet Room", "plum night lilac", "dark", ["dark", "violet"], "#1a1522", "#251f30", "#f0e8fb", "#c7b8db", "#8f819f", "#b794f4", "#c9a9f8", "#1b1228"],
  ["matrix-leaf", "Matrix Leaf", "terminal green", "dark", ["dark", "green"], "#0b120c", "#121a13", "#d7f7d9", "#9dcf9f", "#6a916c", "#39d353", "#58e06e", "#041008"],
  ["crimson-stage", "Crimson Stage", "deep stage reds", "dark", ["dark", "warm"], "#180e10", "#241418", "#f7e8ea", "#d4b0b6", "#9a7278", "#e2556c", "#ef6d81", "#1a080c"],
  ["ocean-glass", "Ocean Glass", "teal over deep blue", "dark", ["dark", "cool"], "#0f1a22", "#172632", "#e5f3fb", "#a9c7d8", "#7392a4", "#3db8a8", "#55c9ba", "#06201c"],
  ["sunset-lane", "Sunset Lane", "coral dusk", "dark", ["dark", "warm"], "#1c1214", "#2a1a1d", "#ffe8df", "#e0b8ab", "#a88278", "#ff7a59", "#ff9175", "#2a100c"],
  ["graphite", "Graphite", "neutral studio charcoal", "dark", ["dark", "mono"], "#17181a", "#222326", "#eceef1", "#b5b9c0", "#858991", "#7aa2ff", "#93b3ff", "#0f1420"],
  ["midnight-jazz", "Midnight Jazz", "indigo club", "dark", ["dark", "cool"], "#111526", "#1a2036", "#e8ecff", "#b4bce0", "#8088ad", "#6c8cff", "#87a1ff", "#10162a"],
  ["copper-wire", "Copper Wire", "industrial copper", "dark", ["dark", "warm"], "#171210", "#241b17", "#f2e6dc", "#cdb4a4", "#947c6e", "#c57b4a", "#d58c5c", "#1c100a"],
];

const light = [
  ["peach-dawn", "Peach Dawn", "soft peach daylight", "light", ["light", "warm"], "#f7eee7", "#fff8f3", "#3a2a24", "#6b534a", "#927870", "#e07a5f", "#c9654c", "#fff8f3"],
  ["lilac-mist", "Lilac Mist", "lavender morning", "light", ["light", "cool"], "#efeaf6", "#f8f5fc", "#2c2438", "#5c526e", "#857995", "#8b6cc7", "#7356b0", "#f8f5fc"],
  ["paper-ink", "Paper Ink", "high-contrast reading", "light", ["light", "mono"], "#f2f0ea", "#fcfbf7", "#1c1b19", "#4a4742", "#7a756c", "#2f6fed", "#1f5ad0", "#ffffff"],
  ["matcha", "Matcha", "green tea lounge", "light", ["light", "green"], "#eaf1e6", "#f5faf2", "#243028", "#4c5d52", "#748579", "#5a8f63", "#487552", "#f5faf2"],
  ["honeycomb", "Honeycomb", "honey over cream", "light", ["light", "warm"], "#f6efd9", "#fff8e8", "#3a2f14", "#6b5a2d", "#94824d", "#c98a1c", "#a97212", "#fff8e8"],
  ["sakura", "Sakura", "soft pink blossom", "light", ["light", "warm"], "#f8eef2", "#fff7fa", "#3a2430", "#6d4a59", "#977484", "#d66d95", "#bf5780", "#fff7fa"],
];

const more = [
  ["ember-forge", "Ember Forge", "molten orange night", "dark", ["dark", "warm"], "#1a100c", "#271812", "#ffe8d6", "#d9b39a", "#9e7a66", "#ff8a3d", "#ff9f5c", "#2a1208"],
  ["glacier", "Glacier", "icy pale blue light", "light", ["light", "cool"], "#e8f1f6", "#f5fafc", "#1e2c36", "#4a5f6c", "#7a8f9c", "#3a8fb7", "#2d7394", "#f5fafc"],
  ["nocturne", "Nocturne", "piano-black violet", "dark", ["dark", "violet"], "#120f18", "#1c1724", "#ede6f8", "#bfb3d4", "#85799a", "#9b7bff", "#b197ff", "#140e22"],
  ["citrus-grove", "Citrus Grove", "lime daylight", "light", ["light", "green"], "#eef5e4", "#f7fbeb", "#27301c", "#51603c", "#7e8d64", "#7fad2f", "#6a9224", "#f7fbeb"],
  ["rosewood", "Rosewood", "deep rose wood", "dark", ["dark", "warm"], "#1a1114", "#26181c", "#f6e6ea", "#d0b0b8", "#967880", "#d45d7a", "#e2758e", "#220c14"],
  ["slate-blue", "Slate Blue", "muted steel office", "dark", ["dark", "cool"], "#15191f", "#1f252e", "#e4eaf2", "#aeb8c6", "#7b8696", "#5b8def", "#749ff2", "#0e1626"],
  ["ivory-coast", "Ivory Coast", "warm ivory sand", "light", ["light", "warm"], "#f4ecdf", "#fbf6ee", "#352b1e", "#64553f", "#92816a", "#b8833a", "#9a6c2c", "#fbf6ee"],
  ["neon-alley", "Neon Alley", "magenta street night", "dark", ["dark", "neon"], "#120816", "#1d0f24", "#f8e6ff", "#d0b0e0", "#9578a8", "#ff3db8", "#ff63c8", "#240816"],
  ["pine-cabin", "Pine Cabin", "forest brown light", "light", ["light", "green"], "#e9ece4", "#f4f6f0", "#2a3024", "#535c48", "#7d8672", "#4f7a4a", "#3f633c", "#f4f6f0"],
  ["cobalt-deep", "Cobalt Deep", "rich cobalt dark", "dark", ["dark", "cool"], "#0d1424", "#152038", "#e2e9ff", "#aebae4", "#7a86b0", "#3d6bff", "#5a84ff", "#0a1230"],
  ["buttercream", "Buttercream", "soft yellow cream", "light", ["light", "warm"], "#f7f2de", "#fcf8ec", "#3a341c", "#675e3c", "#948a64", "#d4b03a", "#b89424", "#fcf8ec"],
  ["ash-violet", "Ash Violet", "desaturated violet dark", "dark", ["dark", "violet"], "#17151c", "#221f2a", "#ebe7f2", "#bbb4c8", "#857e92", "#9a8ec0", "#aea3d0", "#16121f"],
  ["seafoam", "Seafoam", "aqua pastel light", "light", ["light", "cool"], "#e4f3f0", "#f1faf8", "#1f3330", "#4a625e", "#768f8a", "#2ea996", "#248a7a", "#f1faf8"],
  ["lava-glass", "Lava Glass", "black and lava red", "dark", ["dark", "warm"], "#120a0a", "#1e1010", "#ffe4e0", "#d8b0aa", "#9a7874", "#ff4d3a", "#ff6b5a", "#280c0a"],
  ["fog-harbor", "Fog Harbor", "grey-blue fog light", "light", ["light", "cool"], "#e6ebf0", "#f3f6f9", "#24303a", "#4d5c6a", "#7a8a98", "#5a7ea8", "#486888", "#f3f6f9"],
  ["amber-vault", "Amber Vault", "treasure amber dark", "dark", ["dark", "warm"], "#1a140c", "#261e12", "#f5e8d0", "#cbb894", "#92846a", "#f0a020", "#ffb43a", "#2a1808"],
  ["mint-folio", "Mint Folio", "crisp mint page", "light", ["light", "green"], "#e6f4ee", "#f3faf6", "#1f322a", "#4a6156", "#768e82", "#2f9e74", "#25805e", "#f3faf6"],
  ["orchid-night", "Orchid Night", "deep orchid", "dark", ["dark", "violet"], "#160f1a", "#221828", "#f4e6f8", "#ceb2d6", "#947c9c", "#c45ad8", "#d478e6", "#1e0c24"],
  ["clay-studio", "Clay Studio", "terracotta light", "light", ["light", "warm"], "#f3e8e0", "#faf3ee", "#3a2a24", "#6a5248", "#967c72", "#c26b4a", "#a8583c", "#faf3ee"],
  ["steel-rain", "Steel Rain", "cold steel dark", "dark", ["dark", "mono"], "#121416", "#1c1f22", "#e8eaec", "#b4b8bc", "#808488", "#9aa4b0", "#b0bac4", "#0e1012"],
  ["blueberry", "Blueberry", "bright berry light", "light", ["light", "cool"], "#e8eef8", "#f4f7fc", "#222c40", "#4c5870", "#7884a0", "#4a6fd4", "#3a58b0", "#f4f7fc"],
  ["moss-temple", "Moss Temple", "ancient moss dark", "dark", ["dark", "green"], "#10160e", "#1a2216", "#e4f0dc", "#b0c4a4", "#7c9074", "#6aa84a", "#82c05e", "#0e180a"],
  ["champagne", "Champagne", "pale gold celebration", "light", ["light", "warm"], "#f5efdf", "#fbf7ec", "#3a3220", "#655840", "#90806a", "#c4a24a", "#a88838", "#fbf7ec"],
  ["eclipse", "Eclipse", "near-black cyan", "dark", ["dark", "cool"], "#0a0e10", "#12181c", "#dceef2", "#a0c0c8", "#6a8a90", "#20d0e0", "#48dce8", "#061418"],
  ["rose-quartz", "Rose Quartz", "milky rose light", "light", ["light", "warm"], "#f6eaee", "#fcf5f7", "#3a2830", "#68505a", "#947880", "#c87890", "#b06078", "#fcf5f7"],
  ["indigo-ink", "Indigo Ink", "deep indigo page", "dark", ["dark", "cool"], "#0e1220", "#161c30", "#e0e6ff", "#a8b4e0", "#7480a8", "#5a6cff", "#7484ff", "#0c1028"],
  ["kiwi", "Kiwi", "fresh kiwi light", "light", ["light", "green"], "#eaf4e2", "#f5faef", "#28341e", "#526248", "#7c8e72", "#7cbc3a", "#649c2c", "#f5faef"],
  ["obsidian", "Obsidian", "pure dark glass", "dark", ["dark", "mono"], "#0c0c0e", "#161618", "#f0f0f2", "#b8b8bc", "#808084", "#c8c8d0", "#e0e0e8", "#08080a"],
  ["apricot", "Apricot", "sunny apricot light", "light", ["light", "warm"], "#f7ebe0", "#fcf5ef", "#3a2c22", "#685448", "#947c70", "#e08848", "#c47038", "#fcf5ef"],
  ["twilight-bay", "Twilight Bay", "purple-blue dusk", "dark", ["dark", "cool"], "#12141f", "#1c2030", "#e6e8ff", "#b0b6e0", "#7c84a8", "#7a8cff", "#96a4ff", "#101428"],
  ["sage-ledger", "Sage Ledger", "sage paper light", "light", ["light", "green"], "#e8eee6", "#f4f8f2", "#2a3228", "#545e50", "#7e8a7a", "#6a8f6a", "#567656", "#f4f8f2"],
  ["ruby-cellar", "Ruby Cellar", "wine cellar dark", "dark", ["dark", "warm"], "#160c10", "#22141a", "#f6e4ea", "#d0aab4", "#967880", "#c43a5a", "#d85872", "#220810"],
  ["cloud-linen", "Cloud Linen", "soft linen light", "light", ["light", "mono"], "#efeee9", "#f8f7f3", "#2c2b28", "#585652", "#84817c", "#5a6a7a", "#485868", "#f8f7f3"],
  ["plasma", "Plasma", "electric purple dark", "dark", ["dark", "neon"], "#120818", "#1e0e28", "#f2e0ff", "#c8a8e0", "#8e78a8", "#c040ff", "#d068ff", "#1a0828"],
  ["lemonade", "Lemonade", "bright lemon light", "light", ["light", "warm"], "#f6f3d8", "#fbf9ea", "#38341c", "#625c3c", "#8e885e", "#d4c028", "#b8a61c", "#fbf9ea"],
  ["harbor-night", "Harbor Night", "navy dock dark", "dark", ["dark", "cool"], "#0e1620", "#162230", "#e0ecf4", "#a8bcc8", "#748890", "#3a9ad4", "#58b0e4", "#0a1824"],
  ["petal", "Petal", "delicate petal pink", "light", ["light", "warm"], "#f7ecef", "#fcf5f7", "#382830", "#645058", "#907880", "#e08aa4", "#c8728c", "#fcf5f7"],
  ["bronze", "Bronze", "aged bronze dark", "dark", ["dark", "warm"], "#16120e", "#221c16", "#f0e4d4", "#c8b49c", "#908070", "#c89448", "#d8a860", "#1e140a"],
  ["skyline", "Skyline", "clear sky light", "light", ["light", "cool"], "#e6f0f8", "#f2f7fb", "#1e2c38", "#4a5c6c", "#768a9a", "#3a8ad4", "#2e70b0", "#f2f7fb"],
  ["shadow-fern", "Shadow Fern", "deep fern dark", "dark", ["dark", "green"], "#0e140e", "#182018", "#e0f0e0", "#a8c4a8", "#748e74", "#48a858", "#64c070", "#0a180a"],
  ["porcelain", "Porcelain", "cool porcelain light", "light", ["light", "cool"], "#eceef2", "#f6f7fa", "#262830", "#525460", "#7e808c", "#6a7a9a", "#586480", "#f6f7fa"],
  ["magma", "Magma", "volcanic orange dark", "dark", ["dark", "warm"], "#160c08", "#24140c", "#ffe6d4", "#d8b098", "#987868", "#ff6a20", "#ff8848", "#280e06"],
  ["wisteria", "Wisteria", "soft purple light", "light", ["light", "violet"], "#efe8f4", "#f7f2fa", "#2e2438", "#5a4c68", "#867894", "#9870c4", "#8058ac", "#f7f2fa"],
  ["carbon", "Carbon", "matte carbon dark", "dark", ["dark", "mono"], "#101010", "#1a1a1a", "#ececec", "#b4b4b4", "#808080", "#ff6b35", "#ff8558", "#140c08"],
  ["meadow", "Meadow", "open meadow light", "light", ["light", "green"], "#eaf1e4", "#f5f9f0", "#283222", "#525e48", "#7c8a70", "#5a9a48", "#487e3a", "#f5f9f0"],
  ["sapphire", "Sapphire", "royal sapphire dark", "dark", ["dark", "cool"], "#0c1220", "#141c32", "#dde6ff", "#a8b8e8", "#7484b0", "#2f6bff", "#5288ff", "#0a1028"],
  ["sandstone", "Sandstone", "desert stone light", "light", ["light", "warm"], "#f1e9dc", "#f8f3ea", "#362e22", "#625648", "#8e8272", "#b88850", "#9a7040", "#f8f3ea"],
  ["mirage", "Mirage", "purple desert dark", "dark", ["dark", "violet"], "#16101a", "#221828", "#f0e4f4", "#c8b0d0", "#8e7a96", "#d070d8", "#e090e8", "#1e0e24"],
  ["frost", "Frost", "winter frost light", "light", ["light", "cool"], "#e8f0f4", "#f4f8fa", "#223038", "#4e5e68", "#7a8a94", "#4a9ab8", "#3a7e98", "#f4f8fa"],
  ["cinder", "Cinder", "ash and ember dark", "dark", ["dark", "warm"], "#14100e", "#1e1814", "#eee4da", "#c4b4a4", "#8a7c70", "#e07040", "#f08858", "#221008"],
  ["jade", "Jade", "polished jade light", "light", ["light", "green"], "#e4f0ea", "#f0f8f4", "#22342c", "#4e6458", "#7a9084", "#2e9a74", "#247e5e", "#f0f8f4"],
  ["velvet", "Velvet", "velvet red dark", "dark", ["dark", "warm"], "#160a0e", "#241018", "#f8e4ea", "#d4aab8", "#987888", "#c83058", "#e04870", "#220810"],
  ["pearl", "Pearl", "pearlescent light", "light", ["light", "mono"], "#efeeea", "#f8f7f4", "#2c2a28", "#585450", "#84807c", "#8a7a6a", "#726458", "#f8f7f4"],
  ["aurora", "Aurora", "northern lights dark", "dark", ["dark", "cool"], "#0c1418", "#142028", "#e0f4f0", "#a8d0c8", "#749890", "#40d8b0", "#60e8c4", "#081820"],
  ["tangerine", "Tangerine", "bright citrus light", "light", ["light", "warm"], "#f7ebe0", "#fcf5ef", "#3a2a1e", "#68503e", "#94766a", "#f07828", "#d06018", "#fcf5ef"],
  ["inkwell", "Inkwell", "classic ink dark", "dark", ["dark", "mono"], "#0e1014", "#181c22", "#e8ecf0", "#b0b8c0", "#7a848c", "#4a90d8", "#68a8e8", "#0a121c"],
  ["blossom", "Blossom", "spring blossom light", "light", ["light", "warm"], "#f6ecf0", "#fcf5f8", "#382830", "#645058", "#907880", "#e07098", "#c85880", "#fcf5f8"],
  ["thunder", "Thunder", "storm grey dark", "dark", ["dark", "cool"], "#12161a", "#1c2228", "#e4eaf0", "#aeb6c0", "#7a8490", "#6a90c8", "#88a8d8", "#0e141c"],
  ["olive", "Olive", "muted olive light", "light", ["light", "green"], "#ece9dc", "#f6f4ea", "#302e20", "#5a5640", "#86805e", "#7a8a40", "#647234", "#f6f4ea"],
  ["neon-lime", "Neon Lime", "acid lime dark", "dark", ["dark", "neon"], "#0c1208", "#161e10", "#e8f8d8", "#b0d498", "#7a9c6a", "#b8ff20", "#ccff58", "#101808"],
  ["dusty-rose", "Dusty Rose", "muted rose light", "light", ["light", "warm"], "#f2e8e8", "#f9f3f3", "#362828", "#625050", "#8e7878", "#b87878", "#9c6060", "#f9f3f3"],
  ["abyss", "Abyss", "deep ocean abyss", "dark", ["dark", "cool"], "#060c14", "#0e1824", "#d8e8f4", "#98b4c8", "#648090", "#2080c0", "#4098d8", "#061420"],
  ["marigold", "Marigold", "golden flower light", "light", ["light", "warm"], "#f6edd8", "#fbf6ea", "#3a3018", "#665840", "#928060", "#e0a020", "#c08818", "#fbf6ea"],
  ["amethyst", "Amethyst", "crystal purple dark", "dark", ["dark", "violet"], "#120e1a", "#1e1830", "#ece0f8", "#c0b0d8", "#8878a0", "#9858e0", "#b078f0", "#160e28"],
  ["seafoam-dark", "Seafoam Dark", "deep seafoam", "dark", ["dark", "cool"], "#0c1816", "#142420", "#dcf0ea", "#a0c8bc", "#6c9488", "#30c0a0", "#50d4b4", "#081816"],
  ["chalk", "Chalk", "classroom chalk light", "light", ["light", "mono"], "#eef0ea", "#f7f8f4", "#2a2c28", "#545650", "#7e8078", "#4a6a8a", "#3a5670", "#f7f8f4"],
  ["ember-ash", "Ember Ash", "cool ash with ember", "dark", ["dark", "warm"], "#141210", "#1e1c18", "#ece6de", "#c0b8ac", "#888078", "#e85030", "#f07050", "#1c0c08"],
  ["iris", "Iris", "iris blue light", "light", ["light", "cool"], "#e8eaf4", "#f4f5fa", "#262838", "#505468", "#7a8094", "#6870c8", "#5458b0", "#f4f5fa"],
  ["mahogany", "Mahogany", "rich wood dark", "dark", ["dark", "warm"], "#160e0c", "#221612", "#f0e0d6", "#c8b0a4", "#907c72", "#b05030", "#c86848", "#1e0c08"],
  ["celery", "Celery", "pale celery light", "light", ["light", "green"], "#eef2e4", "#f6f8f0", "#2c3220", "#565e40", "#808a60", "#8aaa40", "#728e34", "#f6f8f0"],
  ["ultraviolet", "Ultraviolet", "UV glow dark", "dark", ["dark", "neon"], "#0e0818", "#1a1028", "#ece0ff", "#c0a8e8", "#8878b0", "#8a20ff", "#a850ff", "#140820"],
  ["biscuit", "Biscuit", "warm biscuit light", "light", ["light", "warm"], "#f3eadc", "#f9f4ec", "#362c20", "#625440", "#8e7c68", "#c09050", "#a47840", "#f9f4ec"],
  ["mercury", "Mercury", "liquid metal dark", "dark", ["dark", "mono"], "#121416", "#1c1e22", "#e8eaee", "#b4b8c0", "#80848c", "#a0a8b8", "#b8c0d0", "#0c0e12"],
  ["coral-reef", "Coral Reef", "reef pastel light", "light", ["light", "warm"], "#f6eae6", "#fcf5f2", "#3a2824", "#68504a", "#947872", "#e07860", "#c4604a", "#fcf5f2"],
  ["night-owl", "Night Owl", "late study dark", "dark", ["dark", "cool"], "#0e1218", "#181e28", "#e4eaf2", "#aeb8c8", "#7a8494", "#4a9cff", "#6ab0ff", "#0a121e"],
  ["pistachio", "Pistachio", "soft pistachio light", "light", ["light", "green"], "#eaf0e4", "#f5f8f0", "#2a3224", "#545e48", "#7e8a6c", "#7aa858", "#648c48", "#f5f8f0"],
  ["garnet", "Garnet", "deep garnet dark", "dark", ["dark", "warm"], "#160a0c", "#221214", "#f4e0e4", "#d0a8b0", "#947880", "#b02840", "#c84860", "#1e080c"],
  ["linen-blue", "Linen Blue", "blue linen light", "light", ["light", "cool"], "#e8ecf2", "#f4f6f9", "#262c38", "#505868", "#7a8494", "#5a7ab0", "#486498", "#f4f6f9"],
  ["smog", "Smog", "urban smog dark", "dark", ["dark", "mono"], "#141210", "#1e1c18", "#e8e4de", "#b8b4ac", "#848078", "#d09040", "#e0a858", "#1a1008"],
  ["hibiscus", "Hibiscus", "tropical flower light", "light", ["light", "warm"], "#f6e8ec", "#fcf3f6", "#3a2430", "#684c58", "#947480", "#d05080", "#b8406c", "#fcf3f6"],
  ["deep-teal", "Deep Teal", "museum teal dark", "dark", ["dark", "cool"], "#0c1616", "#142222", "#dceeea", "#a0c4bc", "#6c9088", "#28a898", "#40c0ae", "#081816"],
  ["vanilla", "Vanilla", "vanilla cream light", "light", ["light", "warm"], "#f5f0e4", "#faf7f0", "#363022", "#625a42", "#8e8668", "#c4a860", "#a89048", "#faf7f0"],
  ["punch", "Punch", "fruit punch dark", "dark", ["dark", "warm"], "#160c10", "#24141a", "#f8e4ea", "#d4aab4", "#987888", "#ff4070", "#ff6890", "#220810"],
  ["sky-wash", "Sky Wash", "washed sky light", "light", ["light", "cool"], "#e6f0f6", "#f2f7fa", "#223038", "#4e5e68", "#7a8a94", "#4a9ec8", "#3a82a8", "#f2f7fa"],
  ["basalt", "Basalt", "volcanic rock dark", "dark", ["dark", "mono"], "#101010", "#1a1a1a", "#e8e8e8", "#b0b0b0", "#7c7c7c", "#ff9040", "#ffa868", "#141008"],
  ["fern-light", "Fern Light", "sunlit fern", "light", ["light", "green"], "#e8f0e4", "#f4f8f0", "#283222", "#525e48", "#7c8a70", "#4a9a50", "#3a8040", "#f4f8f0"],
  ["orchid-light", "Orchid Light", "pale orchid day", "light", ["light", "violet"], "#f0e8f2", "#f8f3f9", "#302438", "#5a4c68", "#867894", "#a870c0", "#9058a8", "#f8f3f9"],
  ["coal", "Coal", "coal black orange", "dark", ["dark", "warm"], "#0c0c0c", "#161616", "#f0e8e0", "#c0b4a8", "#887c70", "#ff7020", "#ff8c48", "#180c04"],
  ["breeze", "Breeze", "airy cool light", "light", ["light", "cool"], "#e8f2f4", "#f4f9fa", "#223438", "#4e6268", "#7a8e94", "#3a9aa8", "#2e808c", "#f4f9fa"],
  ["mulberry", "Mulberry", "mulberry night", "dark", ["dark", "violet"], "#140c14", "#201420", "#f0e4f0", "#c8b0c8", "#8e7a8e", "#b040a0", "#c860b8", "#1c0818"],
  ["wheat", "Wheat", "golden wheat light", "light", ["light", "warm"], "#f3ecd8", "#f9f5ea", "#38301c", "#645840", "#908060", "#c4a040", "#a88830", "#f9f5ea"],
  ["cypress", "Cypress", "mediterranean dark", "dark", ["dark", "green"], "#0e1410", "#182018", "#e0ece0", "#a8c0a8", "#748c74", "#509060", "#68a878", "#0c180e"],
  ["cotton", "Cotton", "soft cotton light", "light", ["light", "mono"], "#efefeb", "#f8f8f5", "#2c2c2a", "#585854", "#848480", "#6a8aaa", "#567090", "#f8f8f5"],
  ["flare", "Flare", "solar flare dark", "dark", ["dark", "warm"], "#160e08", "#24180e", "#ffe8d4", "#d8b898", "#98806a", "#ff9020", "#ffaa48", "#241008"],
  ["lagoon", "Lagoon", "tropical lagoon light", "light", ["light", "cool"], "#e4f2f0", "#f0f9f7", "#1e3330", "#4a605c", "#768e8a", "#2aa898", "#228a7c", "#f0f9f7"],
  ["noir", "Noir", "cinema noir dark", "dark", ["dark", "mono"], "#0a0a0a", "#141414", "#f0f0f0", "#b8b8b8", "#808080", "#e0b040", "#f0c860", "#140e04"],
  ["blossom-dark", "Blossom Dark", "night blossom", "dark", ["dark", "warm"], "#140e12", "#201820", "#f4e4ec", "#d0b0c0", "#947888", "#e06090", "#f080a8", "#1c0a14"],
  ["glen", "Glen", "scottish glen light", "light", ["light", "green"], "#e8eee4", "#f4f7f0", "#283022", "#525c48", "#7c8670", "#5a8a58", "#487248", "#f4f7f0"],
  ["comet", "Comet", "comet trail dark", "dark", ["dark", "cool"], "#0c1018", "#161c28", "#e0e8f4", "#a8b8d0", "#7484a0", "#60a0ff", "#80b8ff", "#0a1220"],
  ["nectar", "Nectar", "honey nectar light", "light", ["light", "warm"], "#f5ecd8", "#faf5ea", "#3a3018", "#665840", "#928060", "#d4a028", "#b8881c", "#faf5ea"],
  ["onyx", "Onyx", "polished onyx dark", "dark", ["dark", "mono"], "#080808", "#121212", "#ececec", "#b4b4b4", "#7c7c7c", "#50c8ff", "#78d8ff", "#061018"],
];

const seen = new Set();
const unique = [];
for (const row of [...dark, ...light, ...more]) {
  if (seen.has(row[0])) continue;
  seen.add(row[0]);
  unique.push(row);
}

const body = unique
  .map((r) => {
    const [id, name, desc, base, tags, bg, raised, pt, st, mt, acc, ach, at] = r;
    return `  {
    id: "atrium-${id}",
    name: "${name}",
    description: "${desc}",
    base: "${base}",
    tags: ${JSON.stringify(tags)},
    appBackground: "${bg}",
    raisedBackground: "${raised}",
    primaryText: "${pt}",
    secondaryText: "${st}",
    mutedText: "${mt}",
    accent: "${acc}",
    accentHover: "${ach}",
    accentText: "${at}",
  },`;
  })
  .join("\n");

const header = `import type { ThemeDocument } from "./schema";
import { THEME_FILE_KIND, THEME_SCHEMA_VERSION } from "../../app/brand";
import { duskTheme, mistTheme } from "./presets";

export { duskTheme, mistTheme } from "./presets";

type Palette = {
  id: string;
  name: string;
  description: string;
  base: "light" | "dark";
  tags: string[];
  appBackground: string;
  raisedBackground: string;
  primaryText: string;
  secondaryText: string;
  mutedText: string;
  accent: string;
  accentHover: string;
  accentText: string;
};

const sharedAppearance = {
  fontFamily: '"DM Sans Variable", "Segoe UI", sans-serif',
  headingFontFamily: '"Fraunces Variable", Georgia, serif',
  baseFontSize: 14,
  fontWeight: 450,
  headingWeight: 560,
  letterSpacing: "0.01em",
  lineHeight: 1.45,
  cornerRadiusSmall: 8,
  cornerRadiusMedium: 14,
  cornerRadiusLarge: 22,
  buttonRadius: 999,
  artworkRadius: 16,
  borderWidth: 1,
  shadowStrength: 0.4,
  blurStrength: 18,
  surfaceOpacity: 0.72,
  spacingScale: 1,
  controlHeight: 36,
  sidebarWidth: 72,
  inspectorWidth: 320,
} as const;

function fromPalette(p: Palette): ThemeDocument {
  const dark = p.base === "dark";
  return {
    kind: THEME_FILE_KIND,
    schemaVersion: THEME_SCHEMA_VERSION,
    id: p.id,
    name: p.name,
    description: p.description,
    base: p.base,
    tags: p.tags,
    colors: {
      appBackground: p.appBackground,
      raisedBackground: p.raisedBackground,
      surface: dark
        ? "rgba(255, 255, 255, 0.06)"
        : "rgba(255, 255, 255, 0.62)",
      surfaceHover: dark
        ? "rgba(255, 255, 255, 0.1)"
        : "rgba(255, 255, 255, 0.84)",
      surfaceActive: dark
        ? "rgba(255, 255, 255, 0.12)"
        : "rgba(255, 255, 255, 0.9)",
      surfaceSelected: dark
        ? "rgba(255, 255, 255, 0.14)"
        : "rgba(255, 255, 255, 0.92)",
      primaryText: p.primaryText,
      secondaryText: p.secondaryText,
      mutedText: p.mutedText,
      accent: p.accent,
      accentHover: p.accentHover,
      accentText: p.accentText,
      secondaryAccent: p.accentHover,
      border: dark
        ? "rgba(255, 255, 255, 0.08)"
        : "rgba(20, 24, 28, 0.08)",
      divider: dark
        ? "rgba(255, 255, 255, 0.06)"
        : "rgba(20, 24, 28, 0.06)",
      focusRing: p.accent,
      success: "#3f9d78",
      warning: "#d08a4c",
      danger: "#d16a6a",
      artworkGlow: dark
        ? "rgba(255, 255, 255, 0.18)"
        : "rgba(20, 24, 28, 0.12)",
      waveform: p.accent,
      progressTrack: dark
        ? "rgba(255, 255, 255, 0.14)"
        : "rgba(20, 24, 28, 0.12)",
      progressFill: p.accent,
      lyricActive: p.primaryText,
      lyricPast: dark
        ? "rgba(255, 255, 255, 0.4)"
        : "rgba(20, 24, 28, 0.4)",
      lyricFuture: dark
        ? "rgba(255, 255, 255, 0.72)"
        : "rgba(20, 24, 28, 0.7)",
      selection: dark
        ? "rgba(255, 255, 255, 0.14)"
        : "rgba(20, 24, 28, 0.1)",
      scrollbar: dark
        ? "rgba(255, 255, 255, 0.22)"
        : "rgba(20, 24, 28, 0.22)",
      tooltipBackground: dark ? p.raisedBackground : "#1a2428",
      tooltipText: dark ? p.primaryText : "#f4f7f8",
      contextMenuBackground: p.raisedBackground,
    },
    appearance: {
      ...sharedAppearance,
      shadowStrength: dark ? 0.55 : 0.35,
      blurStrength: dark ? 22 : 18,
    },
    background: {
      mode: "gradient",
      blur: 0,
      darkness: dark ? 0.22 : 0.04,
      brightness: 1,
      saturation: 1.05,
      overlayOpacity: dark ? 0.28 : 0.12,
      noiseAmount: 0.04,
      vignetteAmount: dark ? 0.34 : 0.16,
      animationStrength: 0.2,
    },
  };
}

/** Original Atrium palettes — not third-party theme packs. */
const paletteCatalog: Palette[] = [
`;

const footer = `
];

export const catalogThemes: ThemeDocument[] = paletteCatalog.map(fromPalette);

export const builtinThemes: ThemeDocument[] = [
  mistTheme,
  duskTheme,
  ...catalogThemes,
];

export function getThemeById(id: string): ThemeDocument | undefined {
  return builtinThemes.find((theme) => theme.id === id);
}
`;

fs.writeFileSync("src/features/themes/catalog.ts", header + body + footer);
console.log("palettes", unique.length, "builtin total", unique.length + 2);
