#!/usr/bin/env python3
"""Standard SVG -> PNG converter for the mockups in this directory.

Renders every `svg/*.svg` source to a same-named `*.png` in this directory, so
the committed PNGs stay in sync with their SVG sources (the ones `gen.py` emits
and the hand-authored side-panel mocks alike).

Standard install:  pip install cairosvg
Usage:             python3 svg2png.py [--scale N] [file.svg ...]

With no file arguments it converts all SVGs in `svg/`. `--scale`
(default 2) sets the output resolution multiplier.
"""
import glob
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "svg")


def main(argv):
    scale = 2.0
    args = []
    it = iter(argv)
    for a in it:
        if a == "--scale":
            scale = float(next(it))
        else:
            args.append(a)

    try:
        import cairosvg
    except ImportError:
        sys.exit("cairosvg not installed — run:  pip install cairosvg")

    svgs = args or sorted(glob.glob(os.path.join(SRC, "*.svg")))
    if not svgs:
        sys.exit("no SVGs found")

    for svg in svgs:
        png = os.path.join(HERE, os.path.splitext(os.path.basename(svg))[0] + ".png")
        cairosvg.svg2png(url=svg, write_to=png, scale=scale)
        print("rendered", os.path.basename(png))


if __name__ == "__main__":
    main(sys.argv[1:])
