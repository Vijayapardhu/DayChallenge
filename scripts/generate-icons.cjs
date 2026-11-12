/**
 * Generates the app icons from `src/app/icon.svg`.
 *
 *   src/app/icon.svg       — the source of truth (theme-aware, monochrome)
 *   src/app/favicon.ico    — legacy multi-size icon
 *   src/app/apple-icon.png — iOS home screen icon (180×180)
 *
 * Run with: npm run icons
 */

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const APP_DIR = path.join(__dirname, "..", "src", "app");
const SOURCE = path.join(APP_DIR, "icon.svg");

/** Sizes packed into the .ico, in the order they appear in the directory. */
const ICO_SIZES = [16, 32, 48, 64];

/**
 * Builds an ICO container from PNG payloads.
 *
 * The ICONDIR is followed by one 16-byte directory entry per image, then the
 * image data itself. Each entry stores the PNG bytes, which every browser
 * released this century understands.
 */
function buildIco(images) {
  const HEADER = 6;
  const ENTRY = 16;

  const header = Buffer.alloc(HEADER);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);

  const entries = [];
  let offset = HEADER + ENTRY * images.length;

  for (const { size, data } of images) {
    const entry = Buffer.alloc(ENTRY);
    // 0 means 256 in the ICO format.
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2); // palette size
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += data.length;
  }

  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

async function main() {
  const svg = fs.readFileSync(SOURCE);

  // --- favicon.ico -------------------------------------------------------
  const icons = [];
  for (const size of ICO_SIZES) {
    const data = await sharp(svg, { density: 600 })
      .resize(size, size)
      .png({ compressionLevel: 9 })
      .toBuffer();
    icons.push({ size, data });
  }
  fs.writeFileSync(path.join(APP_DIR, "favicon.ico"), buildIco(icons));

  // --- apple-icon.png -----------------------------------------------------
  // iOS applies its own squircle mask, so the icon must be full-bleed with
  // no transparent corners — flatten the rounded tile onto its own colour.
  await sharp(svg, { density: 600 })
    .resize(180, 180)
    .flatten({ background: "#0a0a0a" })
    .png({ compressionLevel: 9 })
    .toFile(path.join(APP_DIR, "apple-icon.png"));

  console.log(
    `icons written: favicon.ico (${ICO_SIZES.join(", ")}), apple-icon.png (180)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
