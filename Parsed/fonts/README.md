# Bundled fonts

These assets are organized for the parser and output writers:

- `Unicode/` contains Unicode Myanmar input reference faces.
- `output/` contains the Latin and Myanmar faces used to write PDF and DOCX files.
- `zawgyi one/` contains the Zawgyi-One reference face.

Myanmar output currently defaults to MyanmarSagar because it covers the full Myanmar base block (U+1000–U+109F). The font selection is configured by the parser font maps; this README is not a substitute for those maps.

Only font binaries with usable parser or output coverage are retained. Latin-only, Type1, PUA-only, installers, executables, keyboard drivers, images, and archives are excluded. The PUA glyph dump remains in `pua_glyph_dumps.min.json` for possible future reconstruction.

## Original font authors and source

The imported font collection is from [moekyawsoe/Myanmar-Fonts](https://github.com/moekyawsoe/Myanmar-Fonts), commit `cefd1f5297c1fce9d052dd92cdf7bf8cf902426f`. The repository and its individual font authors remain the attribution source. This project does not claim authorship of the font binaries; consult the upstream repository and each font's license before redistribution.
