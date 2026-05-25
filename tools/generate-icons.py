from __future__ import annotations

import argparse
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


REPO_ROOT = Path(__file__).resolve().parents[1]
FONT_PATH = REPO_ROOT / "assets" / "fonts" / "extra.ttf"
OUTPUT_ROOT = REPO_ROOT / "assets" / "icons" / "generated"

MODES = {
    "std": "\ue800",
    "catch": "\ue801",
    "mania": "\ue802",
    "taiko": "\ue803",
}

DIFFICULTY_COLOUR_STOPS = [
    (0.1, "#4290FB"),
    (1.25, "#4FC0FF"),
    (2, "#4FFFD5"),
    (2.5, "#7CFF4F"),
    (3.3, "#F6F05C"),
    (4.2, "#FF8068"),
    (4.9, "#FF4E6F"),
    (5.8, "#C645B8"),
    (6.7, "#6563DE"),
    (7.7, "#18158E"),
    (9, "#000000"),
]

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate local SR-colored osu! mode icons."
    )
    parser.add_argument("--font", type=Path, default=FONT_PATH)
    parser.add_argument("--output", type=Path, default=OUTPUT_ROOT)
    parser.add_argument("--size", type=int, default=22)
    parser.add_argument("--start", type=float, default=0.0)
    parser.add_argument("--end", type=float, default=9.0)
    parser.add_argument("--step", type=float, default=0.01)
    return parser.parse_args()


def hex_to_rgb(value: str) -> tuple[int, int, int]:
    value = value.removeprefix("#")
    return tuple(int(value[index : index + 2], 16) for index in (0, 2, 4))


def rgb_to_hex(rgb: tuple[int, int, int]) -> str:
    return "#{:02x}{:02x}{:02x}".format(*rgb)


def interpolate_rgb_gamma(
    start: tuple[int, int, int],
    end: tuple[int, int, int],
    amount: float,
    gamma: float = 2.2,
) -> tuple[int, int, int]:
    values = []

    for start_value, end_value in zip(start, end):
        start_gamma = (start_value / 255) ** gamma
        end_gamma = (end_value / 255) ** gamma
        interpolated = start_gamma + (end_gamma - start_gamma) * amount
        values.append(round((interpolated ** (1 / gamma)) * 255))

    return tuple(values)


def scale_colour(
    rating: float,
    stops: list[tuple[float, str]],
) -> str:
    if rating <= stops[0][0]:
        return stops[0][1]

    if rating >= stops[-1][0]:
        return stops[-1][1]

    for index, (stop_rating, stop_colour) in enumerate(stops[1:], start=1):
        previous_rating, previous_colour = stops[index - 1]

        if rating <= stop_rating:
            amount = (rating - previous_rating) / (stop_rating - previous_rating)
            return rgb_to_hex(
                interpolate_rgb_gamma(
                    hex_to_rgb(previous_colour),
                    hex_to_rgb(stop_colour),
                    amount,
                )
            )

    return stops[-1][1]


def get_diff_colour(rating: float) -> str:
    if rating < 0.1:
        return "#AAAAAA"

    if rating >= 9:
        return "#000000"

    return scale_colour(rating, DIFFICULTY_COLOUR_STOPS)


def rating_values(start: float, end: float, step: float) -> list[float]:
    start_int = round(start * 100)
    end_int = round(end * 100)
    step_int = round(step * 100)

    if step_int <= 0:
        raise ValueError("--step must be greater than zero")

    return [value / 100 for value in range(start_int, end_int + 1, step_int)]


def draw_icon(
    glyph: str,
    rating: float,
    font: ImageFont.FreeTypeFont,
    size: int,
) -> Image.Image:
    scale = 4
    canvas_size = size * scale
    image = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    bbox = draw.textbbox((0, 0), glyph, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    x = (canvas_size - text_width) / 2 - bbox[0]
    y = (canvas_size - text_height) / 2 - bbox[1]

    draw.text((x, y), glyph, font=font, fill=get_diff_colour(rating))

    return image.resize((size, size), Image.Resampling.LANCZOS)


def generate_icons(args: argparse.Namespace) -> int:
    font_size = math.floor(args.size * 0.72) * 4
    font = ImageFont.truetype(str(args.font), font_size)
    count = 0

    for mode, glyph in MODES.items():
        output_dir = args.output / mode
        output_dir.mkdir(parents=True, exist_ok=True)

        for rating in rating_values(args.start, args.end, args.step):
            icon = draw_icon(glyph, rating, font, args.size)
            icon.save(output_dir / f"{rating:.2f}.png")
            count += 1

    return count


def main() -> None:
    args = parse_args()

    if not args.font.exists():
        raise FileNotFoundError(f"Font not found: {args.font}")

    count = generate_icons(args)
    print(f"Generated {count} icons in {args.output}")


if __name__ == "__main__":
    main()
