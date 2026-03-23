/**
 * convert-images-to-webp.mjs
 *
 * Converts PNG images in public/images/ to WebP format.
 * - Node scene images (public/images/nodes/): lossy WebP, quality 90
 * - Map background (public/images/map/): lossy WebP, quality 90
 * - Mobile image (public/images/mobile/): lossy WebP, quality 90
 * - Fallback party/allies images (public/images/characters/*.png): lossless WebP (has transparency)
 *
 * Originals are deleted after successful conversion.
 *
 * Usage: node scripts/convert-images-to-webp.mjs
 */

import sharp from "sharp";
import { readdir, unlink, access } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.resolve(__dirname, "..", "public");

async function convertFile(filePath, { lossless = false, quality = 90 } = {}) {
  const outPath = filePath.replace(/\.png$/i, ".webp");

  // Skip if WebP already exists and PNG is gone
  try {
    await access(outPath);
    try {
      await access(filePath);
    } catch {
      // WebP exists, PNG already removed
      return { skipped: true, outPath };
    }
  } catch {
    // WebP doesn't exist yet, proceed
  }

  const pipeline = sharp(filePath);
  if (lossless) {
    await pipeline.webp({ lossless: true }).toFile(outPath);
  } else {
    await pipeline.webp({ quality }).toFile(outPath);
  }

  // Remove original PNG
  await unlink(filePath);

  return { skipped: false, outPath };
}

async function convertDirectory(dir, opts) {
  const files = await readdir(dir);
  const pngs = files.filter((f) => f.endsWith(".png"));

  if (pngs.length === 0) {
    console.log(`  (no PNGs in ${path.relative(PUBLIC, dir)})`);
    return;
  }

  for (const file of pngs) {
    const filePath = path.join(dir, file);
    const { skipped, outPath } = await convertFile(filePath, opts);
    const relOut = path.relative(PUBLIC, outPath);
    if (skipped) {
      console.log(`  ✓ ${relOut} (already exists)`);
    } else {
      console.log(`  ✓ ${relOut}`);
    }
  }
}

async function main() {
  console.log("🖼️  Converting PNG images to WebP...\n");

  // Node scene images — lossy (no transparency needed)
  console.log("Node scenes (lossy, quality 90):");
  await convertDirectory(path.join(PUBLIC, "images", "nodes"), { quality: 90 });

  // Map background — lossy
  console.log("\nMap background (lossy, quality 90):");
  await convertDirectory(path.join(PUBLIC, "images", "map"), { quality: 90 });

  // Mobile fallback — lossy
  console.log("\nMobile image (lossy, quality 90):");
  await convertDirectory(path.join(PUBLIC, "images", "mobile"), { quality: 90 });

  // Fallback party/allies images (top-level characters dir only, not generated/)
  console.log("\nFallback character images (lossless, has transparency):");
  const charDir = path.join(PUBLIC, "images", "characters");
  const charFiles = await readdir(charDir);
  const charPngs = charFiles.filter((f) => f.endsWith(".png"));
  for (const file of charPngs) {
    const filePath = path.join(charDir, file);
    const { skipped, outPath } = await convertFile(filePath, { lossless: true });
    const relOut = path.relative(PUBLIC, outPath);
    if (skipped) {
      console.log(`  ✓ ${relOut} (already exists)`);
    } else {
      console.log(`  ✓ ${relOut}`);
    }
  }

  console.log("\n✅ Done! All PNGs converted to WebP.\n");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
