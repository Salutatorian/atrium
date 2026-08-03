"""Make Atrium logo background transparent and export brand assets."""

from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = Path(
    r"C:\Users\JW\.cursor\projects\c-Users-JW-Desktop-projects-music-player"
    r"\assets\c__Users_JW_AppData_Roaming_Cursor_User_workspaceStorage_"
    r"8b5308e86dd194dfa4b614d4bee7a30f_images_"
    r"atrium_logo-aec4709d-996c-4156-8613-4e546db222fa.png"
)


def is_bg(r: int, g: int, b: int, a: int) -> bool:
    # Near-black outer canvas only — portal void stays opaque via flood fill.
    return a > 0 and r <= 18 and g <= 18 and b <= 18


def flood_clear_bg(img: Image.Image) -> Image.Image:
    img = img.convert("RGBA")
    w, h = img.size
    px = img.load()
    visited = [[False] * w for _ in range(h)]
    q: deque[tuple[int, int]] = deque()

    for x in range(w):
        for y in (0, h - 1):
            r, g, b, a = px[x, y]
            if is_bg(r, g, b, a):
                q.append((x, y))
                visited[y][x] = True
    for y in range(h):
        for x in (0, w - 1):
            if visited[y][x]:
                continue
            r, g, b, a = px[x, y]
            if is_bg(r, g, b, a):
                q.append((x, y))
                visited[y][x] = True

    while q:
        x, y = q.popleft()
        px[x, y] = (0, 0, 0, 0)
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < w and 0 <= ny < h and not visited[ny][nx]:
                r, g, b, a = px[nx, ny]
                if is_bg(r, g, b, a):
                    visited[ny][nx] = True
                    q.append((nx, ny))
    return img


def crop_pad(img: Image.Image, pad: int = 8) -> Image.Image:
    bbox = img.getbbox()
    if not bbox:
        return img
    w, h = img.size
    left, top, right, bottom = bbox
    return img.crop(
        (
            max(0, left - pad),
            max(0, top - pad),
            min(w, right + pad),
            min(h, bottom + pad),
        )
    )


def to_square(img: Image.Image) -> Image.Image:
    side = max(img.size)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    ox = (side - img.size[0]) // 2
    oy = (side - img.size[1]) // 2
    canvas.paste(img, (ox, oy), img)
    return canvas


def thumb(img: Image.Image, size: int) -> Image.Image:
    out = img.copy()
    out.thumbnail((size, size), Image.Resampling.LANCZOS)
    return out


def main() -> None:
    brand = ROOT / "docs" / "brand"
    assets = ROOT / "src" / "assets"
    public = ROOT / "public"
    brand.mkdir(parents=True, exist_ok=True)
    assets.mkdir(parents=True, exist_ok=True)
    public.mkdir(parents=True, exist_ok=True)

    logo = crop_pad(flood_clear_bg(Image.open(SRC)))
    square = to_square(logo)

    logo.save(brand / "atrium-logo.png", "PNG", optimize=True)
    square.save(brand / "atrium-logo-square.png", "PNG", optimize=True)
    logo.save(assets / "atrium-logo.png", "PNG", optimize=True)
    logo.save(public / "atrium-logo.png", "PNG", optimize=True)
    square.save(public / "atrium-icon.png", "PNG", optimize=True)

    for size, name in ((64, "atrium-logo-sm.png"), (128, "atrium-logo-md.png")):
        thumb(logo, size).save(brand / name, "PNG", optimize=True)

    thumb(logo, 32).save(public / "favicon-32.png", "PNG", optimize=True)
    thumb(square, 48).save(public / "favicon.png", "PNG", optimize=True)
    # High-res source for `tauri icon`
    square.resize((1024, 1024), Image.Resampling.LANCZOS).save(
        brand / "atrium-icon-1024.png", "PNG", optimize=True
    )

    print(f"logo={logo.size} square={square.size}")


if __name__ == "__main__":
    main()
