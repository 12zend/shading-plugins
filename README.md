# shading-plugins

Official plugins for [shading.app](https://github.com/12zend/shading). Each folder is one plugin and can be zipped
as-is; shading.app imports the zip from the button at the bottom-left of the code area.

shading.app の公式プラグインです。フォルダ1つが1つのプラグインで、そのまま zip にして
コードエリア左下のボタンから読み込めます。

| Folder | Plugin | Adds |
| --- | --- | --- |
| [`color-adjust`](color-adjust) | Color Adjust / 色調補正 | contrast, brightness, gamma, saturation, alpha, color blindness, HSL adjust, tone map, auto exposure, palette swap, chroma key, color overlay, gradation overlay (gradient editor), color adjustment |
| [`color-grading`](color-grading) | Color Grading / カラーグレーディング | manual grade and 100+ one-click looks with thumbnail previews |
| [`lut`](lut) | LUT | LUT block, LUT tab, LUT images saved in the project |
| [`blur`](blur) | Blur / ぼかし | gaussian, directional, radial and lens blur, depth of field |
| [`glow`](glow) | Glow / グロー | bloom, deep glow |
| [`stylize`](stylize) | Stylize / スタイライズ | stroke, edge detection, sharpen, FXAA, difference of Gaussians, Kuwahara |
| [`film`](film) | Film & Retro / フィルム・レトロ | RGB shift, film grain, dither, halftone, ASCII, CRT, VHS, glitch |
| [`lens`](lens) | Lens & Frame / レンズ・フレーム | chromatic aberration, lens distortion, vignette, composition guides, framing, zoom, depth fog |
| [`distort`](distort) | Distort / 変形 | wavy, pulse, pixelate, pixel stretch, mirror, transform, duplicate, displacement map |
| [`fractal-noise`](fractal-noise) | Fractal Noise / フラクタルノイズ | procedural fractal noise |
| [`pixel-sort`](pixel-sort) | Pixel Sort / ピクセルソート | CPU pixel sorting |
| [`blob-tracking`](blob-tracking) | Blob Tracking / ブロブ検出 | blob detection and tracking overlays |
| [`buffer-stack`](buffer-stack) | Buffer Stack / バッファースタック | frame accumulation (trails, long exposure) |
| [`genshade`](genshade) | Genshade / ReShade | ReShade FX effects compiled to WebGL (compiler and textures included, ~45 MB) |
| [`easy`](easy) | Easy Looks / かんたんルック | one-click looks built from the plugins above |

These effects used to be built into shading.app. Their blocks keep the same opcodes and menu names, so projects made
before the split open unchanged once the needed plugins are installed; shading.app names any missing plugin.

これらは以前 shading.app に内蔵されていたエフェクトです。ブロックの opcode とメニュー名は変わっていないため、
必要なプラグインをインストールすれば既存のプロジェクトはそのまま動きます。不足しているプラグインは本体が表示します。

## Packaging / zip の作り方

```sh
./scripts/pack.sh            # every plugin -> dist/<id>.zip
./scripts/pack.sh blur lut   # only some plugins
```

or simply `zip -r blur.zip blur`. The zip may contain the folder itself or only its contents.

## Signing / 署名

Every plugin folder contains `shading-plugin.sig`. shading.app shows signed plugins as official, marks a changed
official plugin as having an invalid signature, and only installs signed plugins from its `/install` page.
**Re-sign after changing any file in a plugin**, or the shading tests and the install page will reject it.

各プラグインには `shading-plugin.sig` が入っています。shading.app は署名済みのものを「公式・署名済み」と表示し、
改変されたものを「署名が無効」として警告します。`/install` ページは署名済みのものしかインストールしません。
**プラグインのファイルを変更したら、必ず署名し直してください。**

```sh
node scripts/sign.mjs              # sign every plugin / 全プラグインに署名
node scripts/sign.mjs blur         # sign one plugin / 1つだけ署名
node scripts/sign.mjs --check      # verify without the private key / 秘密鍵なしで検証
```

The private key is never committed. It is read from `SHADING_PLUGIN_SIGNING_KEY` (path to a PKCS#8 PEM) or
`~/.config/shading/plugin-signing-key.pem`. The public keys are in `signing-keys.json` and must match `OFFICIAL_KEYS`
in shading's `src/lib/plugins/signature.js`. To rotate keys, run `node scripts/sign.mjs --generate-key` (after moving
the old key away), add the new key to both places under a new id, and re-sign.

秘密鍵はコミットしません。`SHADING_PLUGIN_SIGNING_KEY`（PEM のパス）か `~/.config/shading/plugin-signing-key.pem`
から読み込みます。公開鍵は `signing-keys.json` と shading 本体の `OFFICIAL_KEYS` の両方に同じものを登録します。

## Writing plugins / プラグインの作り方

A plugin is a folder with `shading-plugin.json` and a CommonJS `main.js` exporting `activate(shading)`. The API,
the security review shown before installation, and project compatibility are described in
[docs/PLUGINS.md](https://github.com/12zend/shading/blob/develop/docs/PLUGINS.md) in the shading repository.

Plugins run with the same privileges as the editor. shading.app scans every zip before installation and warns about
risky code, but only install plugins you trust.

## Tests

The shading repository tests these plugins: with this repository checked out next to it (or `SHADING_PLUGINS_DIR`
pointing here), run `npx jest test/unit/plugins test/unit/util/pen-fx` in shading.

## Tools

`tools/genshade` regenerates the Genshade catalog and assets from the ReShade FX sources in `tools/genshade/Shaders`
(`python3 tools/genshade/generate.py <path-to-compiled-fx-compiler>`). It is not part of any plugin zip.

## License

GPL-3.0 (see [LICENSE](LICENSE)), like shading.app. Genshade bundles the ReShade FX compiler (BSD-3-Clause, see
[genshade/RESHADE-LICENSE.md](genshade/RESHADE-LICENSE.md)) and shaders under their authors' licenses.
