/**
 * generate-party-images.mjs
 *
 * Reads timeline.json, determines every unique party/allies composition
 * across all journey steps, and composites individual character PNGs
 * into group images. Outputs to public/images/characters/generated/.
 *
 * Features:
 *   - Removes white/near-white backgrounds from character art
 *   - Composites members in a chevron formation (back-to-front)
 *   - Caches by composition hash so unchanged groups aren't re-rendered
 *   - Gracefully skips members whose art doesn't exist yet
 *
 * Usage: node scripts/generate-party-images.mjs
 */

import sharp from "sharp";
import { createHash } from "crypto";
import { readFile, writeFile, access, mkdir, readdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PUBLIC = path.join(ROOT, "public");
const CHARACTERS_DIR = path.join(PUBLIC, "images", "characters");
const OUTPUT_DIR = path.join(CHARACTERS_DIR, "generated");
const TIMELINE_PATH = path.join(PUBLIC, "data", "timeline.json");

// ---------------------------------------------------------------------------
// CONFIG
// ---------------------------------------------------------------------------

const CANVAS = { width: 800, height: 600 };

const LAYOUT = {
  paddingTop: 0.08,
  paddingBottom: 0.05,
  horizontalSpread: 0.55,
  zigzagDecay: 0.85,
  scaleBack: 0.75,
  scaleFront: 1.0,
};

// ---------------------------------------------------------------------------
// WHITE BACKGROUND REMOVAL
// ---------------------------------------------------------------------------

/**
 * Remove white/near-white background from a PNG buffer using flood-fill
 * from the edges. Only removes white pixels connected to the border,
 * preserving interior whites (eyes, teeth, highlights, etc.).
 */
async function removeWhiteBackground(inputBuffer) {
  const image = sharp(inputBuffer).ensureAlpha();
  const { data, info } = await image
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const output = Buffer.from(data);

  const THRESHOLD = 230;     // min channel value to consider "white"
  const VARIANCE_MAX = 20;   // max spread between R/G/B channels
  const FEATHER_RANGE = 25;  // range for anti-alias feathering

  function isWhitish(idx) {
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const min = Math.min(r, g, b);
    const max = Math.max(r, g, b);
    return min >= THRESHOLD && (max - min) <= VARIANCE_MAX;
  }

  function isNearWhitish(idx) {
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const min = Math.min(r, g, b);
    const max = Math.max(r, g, b);
    return min >= (THRESHOLD - FEATHER_RANGE) && (max - min) <= VARIANCE_MAX;
  }

  // Flood-fill from all edge pixels that are white
  const visited = new Uint8Array(width * height);
  const queue = [];

  // Seed from all 4 edges
  for (let x = 0; x < width; x++) {
    if (isWhitish(x * channels)) queue.push(x);                               // top row
    const bottom = (height - 1) * width + x;
    if (isWhitish(bottom * channels)) queue.push(bottom);                      // bottom row
  }
  for (let y = 1; y < height - 1; y++) {
    if (isWhitish(y * width * channels)) queue.push(y * width);               // left col
    const right = y * width + (width - 1);
    if (isWhitish(right * channels)) queue.push(right);                        // right col
  }

  // Mark seeds as visited
  for (const idx of queue) visited[idx] = 1;

  // BFS flood-fill
  while (queue.length > 0) {
    const pixel = queue.shift();
    const px = pixel % width;
    const py = Math.floor(pixel / width);

    // Make transparent
    output[pixel * channels + 3] = 0;

    // Check 4-connected neighbors
    const neighbors = [];
    if (px > 0) neighbors.push(pixel - 1);
    if (px < width - 1) neighbors.push(pixel + 1);
    if (py > 0) neighbors.push(pixel - width);
    if (py < height - 1) neighbors.push(pixel + width);

    for (const n of neighbors) {
      if (visited[n]) continue;
      visited[n] = 1;
      if (isWhitish(n * channels)) {
        queue.push(n);
      }
    }
  }

  // Feather pass: for non-visited near-white pixels adjacent to removed pixels,
  // apply partial transparency for smooth edges
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixel = y * width + x;
      if (visited[pixel]) continue; // already removed
      if (!isNearWhitish(pixel * channels)) continue;

      // Check if any neighbor was removed (is in the flood-filled region)
      let adjacentToRemoved = false;
      if (x > 0 && visited[pixel - 1]) adjacentToRemoved = true;
      if (x < width - 1 && visited[pixel + 1]) adjacentToRemoved = true;
      if (y > 0 && visited[pixel - width]) adjacentToRemoved = true;
      if (y < height - 1 && visited[pixel + width]) adjacentToRemoved = true;

      if (adjacentToRemoved) {
        const r = data[pixel * channels];
        const g = data[pixel * channels + 1];
        const b = data[pixel * channels + 2];
        const min = Math.min(r, g, b);
        const factor = Math.max(0, (THRESHOLD - min) / FEATHER_RANGE);
        output[pixel * channels + 3] = Math.round(data[pixel * channels + 3] * factor);
      }
    }
  }

  return sharp(output, { raw: { width, height, channels } })
    .png()
    .toBuffer();
}

// ---------------------------------------------------------------------------
// LAYOUT
// ---------------------------------------------------------------------------

async function calculateLayout(members, canvas = CANVAS) {
  const withMeta = [];

  for (const m of members) {
    try {
      const meta = await sharp(m.buffer).metadata();
      withMeta.push({ ...m, width: meta.width, height: meta.height });
    } catch {
      console.warn(`  ⚠ Could not read metadata for ${m.id}, skipping`);
    }
  }

  if (withMeta.length === 0) return [];

  // Sort by zIndex (back-to-front)
  const sorted = [...withMeta].sort((a, b) => a.zIndex - b.zIndex);
  const count = sorted.length;

  // Normalize: each member's base size should fit within a slot
  // Max height per member = canvas height / (count * 0.7) to allow overlap
  const maxMemberHeight = canvas.height / Math.max(count * 0.7, 1.2);
  const maxMemberWidth = canvas.width * 0.4;

  sorted.forEach((member) => {
    const hScale = maxMemberHeight / member.height;
    const wScale = maxMemberWidth / member.width;
    const baseScale = Math.min(hScale, wScale, 1); // never upscale
    member.width = Math.round(member.width * baseScale);
    member.height = Math.round(member.height * baseScale);
  });

  const topY = canvas.height * LAYOUT.paddingTop;
  const bottomY = canvas.height * (1 - LAYOUT.paddingBottom);
  const availableHeight = bottomY - topY;

  const centerX = canvas.width / 2;
  const maxSpread = (canvas.width * LAYOUT.horizontalSpread) / 2;

  sorted.forEach((member, i) => {
    const t = count > 1 ? i / (count - 1) : 0.5;

    // Scale based on depth, multiplied by per-character scale
    const depthScale = LAYOUT.scaleBack + t * (LAYOUT.scaleFront - LAYOUT.scaleBack);
    const scale = depthScale * (member.charScale || 1.0);
    const scaledW = Math.round(member.width * scale);
    const scaledH = Math.round(member.height * scale);

    // Y position
    const rawY = topY + t * availableHeight;

    // X zigzag from center
    let offsetX = 0;
    if (i > 0) {
      const ring = Math.ceil(i / 2);
      const direction = i % 2 === 1 ? 1 : -1;
      const magnitude = (ring / Math.ceil(count / 2)) * maxSpread;
      offsetX = direction * magnitude * Math.pow(LAYOUT.zigzagDecay, ring - 1);
    }

    member.x = Math.round(centerX + offsetX - scaledW / 2);
    member.y = Math.round(rawY - scaledH / 2);
    member.scale = scale;
    member.scaledW = scaledW;
    member.scaledH = scaledH;
  });

  return sorted;
}

// ---------------------------------------------------------------------------
// COMPOSITOR
// ---------------------------------------------------------------------------

async function compositeGroup(members, canvas = CANVAS) {
  const laid = await calculateLayout(members, canvas);
  if (laid.length === 0) return null;

  const compositeOps = await Promise.all(
    laid.map(async (m) => {
      const resized = await sharp(m.buffer)
        .resize(m.scaledW, m.scaledH, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toBuffer();

      // Clamp position so the resized image stays within canvas
      const top = Math.max(0, Math.min(m.y, canvas.height - m.scaledH));
      const left = Math.max(0, Math.min(m.x, canvas.width - m.scaledW));

      return {
        input: resized,
        top,
        left,
      };
    })
  );

  return sharp({
    create: {
      width: canvas.width,
      height: canvas.height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(compositeOps)
    .png()
    .toBuffer();
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

function getCompositionHash(memberSpecs, characters) {
  const payload = JSON.stringify(
    memberSpecs.map((m) => {
      const charDef = characters?.[m.id] || {};
      return { id: m.id, variant: m.variant, flip: !!charDef.flip, scale: charDef.scale || 1 };
    }).sort((a, b) => a.id.localeCompare(b.id))
  );
  return createHash("sha256").update(payload).digest("hex").slice(0, 12);
}

function getGroupAtStep(group, step) {
  // Start with default
  let current = group.default;
  let location = group.location || null;

  // Apply changes up to this step
  if (group.changes) {
    for (const change of group.changes) {
      if (step >= change.atStep) {
        current = change.set;
        if (change.location) location = change.location;
      }
    }
  }

  return { members: current, location };
}

async function resolveAsset(characterId, variantIndex, characters) {
  const charDef = characters[characterId];
  if (!charDef) return null;

  const assetRelPath = charDef.assets[variantIndex] || charDef.assets[0];
  if (!assetRelPath) return null;

  const fullPath = path.join(CHARACTERS_DIR, assetRelPath);

  try {
    await access(fullPath);
  } catch {
    return null;
  }

  return fullPath;
}

async function main() {
  console.log("🎨 Generating party/allies composite images...\n");

  const timeline = JSON.parse(await readFile(TIMELINE_PATH, "utf8"));
  const { characters, groups } = timeline.campaign;

  if (!characters || !groups) {
    console.log("No characters/groups defined in timeline.json, nothing to do.");
    return;
  }

  await mkdir(OUTPUT_DIR, { recursive: true });

  // Determine total journey steps
  const totalSteps = timeline.paths.length + 1; // +1 for starting node

  // Collect all unique compositions we need to generate
  const compositions = new Map(); // hash -> { memberSpecs, groupName, steps }

  for (const [groupName, group] of Object.entries(groups)) {
    for (let step = 0; step < totalSteps; step++) {
      const { members: memberSpecs } = getGroupAtStep(group, step);
      if (!memberSpecs) continue;

      const hash = getCompositionHash(memberSpecs, characters);
      if (!compositions.has(hash)) {
        compositions.set(hash, { memberSpecs, groupName, steps: [step] });
      } else {
        compositions.get(hash).steps.push(step);
      }
    }
  }

  console.log(`Found ${compositions.size} unique compositions to generate.\n`);

  // Generate each unique composition
  const generated = new Map(); // hash -> filename

  for (const [hash, { memberSpecs, groupName }] of compositions) {
    const filename = `${groupName}_${hash}.png`;
    const outputPath = path.join(OUTPUT_DIR, filename);

    // Check if already exists
    try {
      await access(outputPath);
      console.log(`  ✓ ${filename} (cached)`);
      generated.set(hash, filename);
      continue;
    } catch {
      // Need to generate
    }

    // Resolve and prepare member buffers
    const members = [];
    let allResolved = true;

    for (let i = 0; i < memberSpecs.length; i++) {
      const spec = memberSpecs[i];
      const assetPath = await resolveAsset(spec.id, spec.variant, characters);

      if (!assetPath) {
        console.warn(`  ⚠ Missing art for ${spec.id} (variant ${spec.variant}), skipping member`);
        allResolved = false;
        continue;
      }

      // Read, remove white background, and optionally flip
      const charDef = characters[spec.id];
      const rawBuffer = await readFile(assetPath);
      let cleanBuffer = await removeWhiteBackground(rawBuffer);

      if (charDef.flip) {
        cleanBuffer = await sharp(cleanBuffer).flop().png().toBuffer();
      }

      members.push({
        id: spec.id,
        zIndex: i,
        buffer: cleanBuffer,
        charScale: charDef.scale || 1.0,
      });
    }

    if (members.length === 0) {
      console.warn(`  ⚠ No valid members for ${groupName} composition ${hash}, skipping`);
      continue;
    }

    const result = await compositeGroup(members);
    if (result) {
      await writeFile(outputPath, result);
      console.log(`  ✓ ${filename} (${members.length} members${allResolved ? "" : ", partial"})`);
      generated.set(hash, filename);
    }
  }

  // Build a manifest mapping step -> image filename for each group
  const manifest = {};

  for (const [groupName, group] of Object.entries(groups)) {
    manifest[groupName] = {};

    for (let step = 0; step < totalSteps; step++) {
      const { members: memberSpecs, location } = getGroupAtStep(group, step);
      if (!memberSpecs) {
        manifest[groupName][step] = { image: null, location: null };
        continue;
      }

      const hash = getCompositionHash(memberSpecs, characters);
      const filename = generated.get(hash);
      manifest[groupName][step] = {
        image: filename ? `/images/characters/generated/${filename}` : null,
        location: location || null,
      };
    }
  }

  // Write manifest
  const manifestPath = path.join(OUTPUT_DIR, "manifest.json");
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`\n📋 Manifest written to ${path.relative(ROOT, manifestPath)}`);
  console.log("Done!\n");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
