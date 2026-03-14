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
 *   - Each character is always the same pixel height regardless of party size
 *   - Caches by composition hash so unchanged groups aren't re-rendered
 *   - Gracefully skips members whose art doesn't exist yet
 *
 * Usage: node scripts/generate-party-images.mjs [--force]
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

// Bump this when compositor logic changes to invalidate all cached images.
const LAYOUT_VERSION = 2;

// Every character is first normalized to this height (erasing native resolution
// differences), then charScale is applied.  A scale-1.0 character = NORM_HEIGHT px.
const NORM_HEIGHT = 1000;

// Fixed cell dimensions for positioning. These never change with party size.
const CELL_W = 550;
const CELL_H = NORM_HEIGHT;

const LAYOUT = {
  rowShift: 0.5,           // each consecutive row shifts right by this many cells
  rowOverlap: 0.45,        // fraction of row height that overlaps with next row
  colOverlap: 0.20,        // fraction of cell width that overlaps with next column
  marginX: 60,             // horizontal margin around the composed group
  marginY: 40,             // vertical margin above/below
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

/**
 * Distribute N members into rows:
 *   - 1-2 members: 1 row
 *   - 3-4 members: 2 rows (max 2 per row)
 *   - 5+  members: max 3 per row, add rows as needed
 * Back rows (earlier) are filled first so they have more members.
 */
function getRowDistribution(count) {
  if (count <= 0) return [];
  if (count <= 2) return [count];
  if (count <= 4) {
    // 2 rows, back row gets more
    const back = Math.ceil(count / 2);
    return [back, count - back];
  }
  // 5+: fill rows of up to 3, back rows first
  const rows = [];
  let remaining = count;
  while (remaining > 0) {
    rows.push(Math.min(3, remaining));
    remaining -= rows[rows.length - 1];
  }
  return rows;
}

/**
 * Calculate layout positions using a FIXED per-character size.
 *
 * Flow:
 *   1. Normalize every character to NORM_HEIGHT (erases native resolution diffs)
 *   2. Apply charScale only (no depth scaling — all rows same size)
 *   3. Position in grid with yOffset
 *   4. Compute canvas from bounding box
 *
 * Returns { laid, canvasWidth, canvasHeight }.
 */
async function calculateLayout(members, { forceOneRow = false } = {}) {
  const withMeta = [];

  for (const m of members) {
    try {
      const meta = await sharp(m.buffer).metadata();
      withMeta.push({ ...m, origW: meta.width, origH: meta.height });
    } catch {
      console.warn(`  ⚠ Could not read metadata for ${m.id}, skipping`);
    }
  }

  if (withMeta.length === 0) return { laid: [], canvasWidth: 0, canvasHeight: 0 };

  // Sort by order (lower = back row, left side)
  const sorted = [...withMeta].sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
  const count = sorted.length;
  const rows = forceOneRow ? [count] : getRowDistribution(count);
  const numRows = rows.length;
  const maxRowSize = Math.max(...rows);

  // Step 1+2: normalize to NORM_HEIGHT, then apply charScale
  sorted.forEach((member) => {
    const normScale = NORM_HEIGHT / member.origH;
    const cs = member.charScale || 1.0;
    const s = normScale * cs;
    member.scaledW = Math.round(member.origW * s);
    member.scaledH = Math.round(member.origH * s);
  });

  // Grid spacing — fixed regardless of composition
  const colStep = CELL_W * (1 - LAYOUT.colOverlap);
  const rowStep = CELL_H * (1 - LAYOUT.rowOverlap);

  // Compute total grid size
  const lastRowShift = (numRows - 1) * LAYOUT.rowShift;
  const effectiveCols = maxRowSize + lastRowShift;
  const gridWidth = (effectiveCols - 1) * colStep + CELL_W;
  const gridHeight = CELL_H + (numRows - 1) * rowStep;

  // Find max offsets to expand canvas as needed (positive yOffset = down, negative = up)
  const maxYDown = Math.max(0, ...sorted.map(m => m.yOffset || 0));
  const maxYUp = Math.max(0, ...sorted.map(m => -(m.yOffset || 0)));
  const maxXOffset = Math.max(0, ...sorted.map(m => Math.abs(m.xOffset || 0)));

  const canvasWidth = Math.round(gridWidth + LAYOUT.marginX * 2 + maxXOffset * 2);
  const canvasHeight = Math.round(gridHeight + LAYOUT.marginY * 2 + maxYDown + maxYUp);

  // Place members row by row
  const laid = [];
  let memberIdx = 0;

  const gridStartX = LAYOUT.marginX + maxXOffset;
  const gridStartY = LAYOUT.marginY + maxYUp;

  for (let r = 0; r < numRows; r++) {
    const rowSize = rows[r];

    // Row bottom Y
    const rowBottomY = gridStartY + CELL_H + r * rowStep;

    // Row X offset: staircase shift
    const rowOffsetX = r * LAYOUT.rowShift * colStep / (1 - LAYOUT.colOverlap);

    // Center this row within its available columns
    const rowWidth = (rowSize - 1) * colStep + CELL_W;
    const maxRowWidth = (maxRowSize - 1) * colStep + CELL_W;
    const rowCenterOffset = (maxRowWidth - rowWidth) / 2;

    const rowStartX = gridStartX + rowOffsetX + rowCenterOffset;

    const rowMembers = [];
    for (let c = 0; c < rowSize; c++) {
      const member = sorted[memberIdx++];

      // Center horizontally in column, anchor to bottom of row
      const cellCenterX = rowStartX + c * colStep + CELL_W / 2;

      member.x = Math.round(cellCenterX - member.scaledW / 2 + (member.xOffset || 0));
      member.y = Math.round(rowBottomY - member.scaledH + (member.yOffset || 0));
      rowMembers.push(member);
    }
    // Reverse: rightmost first (background), leftmost last (foreground)
    rowMembers.reverse();
    laid.push(...rowMembers);
  }

  return { laid, canvasWidth, canvasHeight };
}

// ---------------------------------------------------------------------------
// COMPOSITOR
// ---------------------------------------------------------------------------

async function compositeGroup(members, overrideCanvas = null, layoutOpts = {}) {
  const { laid, canvasWidth, canvasHeight } = await calculateLayout(members, layoutOpts);
  if (laid.length === 0) return null;

  const cw = overrideCanvas ? overrideCanvas.width : canvasWidth;
  const ch = overrideCanvas ? overrideCanvas.height : canvasHeight;

  const compositeOps = await Promise.all(
    laid.map(async (m) => {
      const resized = await sharp(m.buffer)
        .resize(m.scaledW, m.scaledH, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toBuffer();

      // Allow positions to use full canvas (canvas is already sized to fit all offsets)
      const top = Math.max(0, m.y);
      const left = Math.max(0, m.x);

      return {
        input: resized,
        top,
        left,
      };
    })
  );

  return sharp({
    create: {
      width: cw,
      height: ch,
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

async function getCompositionHash(memberSpecs, characters) {
  const hash = createHash("sha256");

  // Include layout version so hash changes when compositor logic changes
  hash.update(String(LAYOUT_VERSION));

  // Include config
  const config = memberSpecs.map((m) => {
    const charDef = characters?.[m.id] || {};
    return { id: m.id, variant: m.variant, flip: !!charDef.flip, scale: charDef.scale || 1, xOffset: charDef.xOffset || 0, yOffset: charDef.yOffset || 0, order: charDef.order ?? 99 };
  }).sort((a, b) => a.id.localeCompare(b.id));
  hash.update(JSON.stringify(config));

  // Include actual file contents so changed images invalidate cache
  for (const m of config) {
    const charDef = characters?.[m.id];
    if (!charDef) continue;
    const assetRelPath = charDef.assets[m.variant] || charDef.assets[0];
    if (!assetRelPath) continue;
    const fullPath = path.join(CHARACTERS_DIR, assetRelPath);
    try {
      const buf = await readFile(fullPath);
      hash.update(buf);
    } catch {
      // file missing, hash will differ from any valid composition
    }
  }

  return hash.digest("hex").slice(0, 12);
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
  const forceRebuild = process.argv.includes("--force");
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

      const hash = await getCompositionHash(memberSpecs, characters);
      if (!compositions.has(hash)) {
        compositions.set(hash, { memberSpecs, groupName, steps: [step] });
      } else {
        compositions.get(hash).steps.push(step);
      }
    }
  }

  console.log(`Found ${compositions.size} unique compositions to generate.\n`);

  // Clean up ALL old generated images before generating new ones
  const existingFiles = await readdir(OUTPUT_DIR);
  const keepFiles = new Set(["manifest.json", "_test_all_characters.png"]);
  const neededFiles = new Set([...compositions.keys()].map(
    (hash) => {
      const comp = compositions.get(hash);
      return `${comp.groupName}_${hash}.png`;
    }
  ));
  let cleaned = 0;
  for (const f of existingFiles) {
    if (!keepFiles.has(f) && !neededFiles.has(f)) {
      const { unlink } = await import("fs/promises");
      await unlink(path.join(OUTPUT_DIR, f));
      cleaned++;
    }
  }
  if (cleaned > 0) console.log(`🧹 Cleaned up ${cleaned} stale files\n`);

  // Generate each unique composition
  const generated = new Map(); // hash -> filename

  for (const [hash, { memberSpecs, groupName }] of compositions) {
    const filename = `${groupName}_${hash}.png`;
    const outputPath = path.join(OUTPUT_DIR, filename);

    // Check if already exists (skip if --force)
    if (!forceRebuild) {
      try {
        await access(outputPath);
        console.log(`  ✓ ${filename} (cached)`);
        generated.set(hash, filename);
        continue;
      } catch {
        // Need to generate
      }
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
        order: charDef.order ?? 99,
        buffer: cleanBuffer,
        charScale: charDef.scale || 1.0,
        xOffset: charDef.xOffset || 0,
        yOffset: charDef.yOffset || 0,
      });
    }

    if (members.length === 0) {
      console.warn(`  ⚠ No valid members for ${groupName} composition ${hash}, skipping`);
      continue;
    }

    let result = await compositeGroup(members);
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

      const hash = await getCompositionHash(memberSpecs, characters);
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

  // Generate a test image with ALL characters (variant 0) for size comparison
  console.log("\n🧪 Generating all-characters test image...");
  const charEntries = Object.entries(characters);
  const maxVariants = Math.max(...charEntries.map(([, def]) => def.assets.length));
  const numChars = charEntries.length;

  // Pre-load and clean variant 0 for each character (fallback)
  const cleanBuffers = {}; // charId -> { variantIndex -> buffer }
  for (const [charId, charDef] of charEntries) {
    cleanBuffers[charId] = {};
    for (let v = 0; v < charDef.assets.length; v++) {
      const assetPath = await resolveAsset(charId, v, characters);
      if (!assetPath) continue;
      const rawBuffer = await readFile(assetPath);
      let clean = await removeWhiteBackground(rawBuffer);
      if (charDef.flip) {
        clean = await sharp(clean).flop().png().toBuffer();
      }
      cleanBuffers[charId][v] = clean;
    }
  }

  // Build control row (no scale) and scaled variant rows
  const testCellW = 400;
  const testRowH = 1200;
  const labelHeight = 100;
  const testCanvasW = numChars * testCellW;

  // Control row: variant 0, all scale = 1.0
  const controlRow = [];
  for (const [charId] of charEntries) {
    const buffer = cleanBuffers[charId][0];
    if (!buffer) continue;
    controlRow.push({
      id: charId,
      order: controlRow.length,
      buffer,
      charScale: 1.0, // no scale applied
      yOffset: 0,
    });
  }

  // Scaled variant rows
  const variantRows = [];
  for (let v = 0; v < maxVariants; v++) {
    const row = [];
    for (const [charId, charDef] of charEntries) {
      const buffer = cleanBuffers[charId][v] || cleanBuffers[charId][0];
      if (!buffer) continue;
      row.push({
        id: charId,
        order: charDef.order ?? row.length,
        buffer,
        charScale: charDef.scale || 1.0,
        xOffset: charDef.xOffset || 0,
        yOffset: charDef.yOffset || 0,
      });
    }
    variantRows.push(row);
  }

  // Render control row with fixed canvas for test image
  const testCanvas = { width: testCanvasW, height: testRowH };
  const controlResult = await compositeGroup(controlRow, testCanvas, { forceOneRow: true });

  // Create label bar with scale values
  const labelSvgParts = charEntries.map(([charId, charDef], i) => {
    const scale = charDef.scale || 1.0;
    const x = i * testCellW + testCellW / 2;
    return `<text x="${x}" y="65" text-anchor="middle" font-size="48" font-family="Arial, sans-serif" fill="white">${charId}: ${scale}</text>`;
  });
  const labelSvg = `<svg width="${testCanvasW}" height="${labelHeight}">
    <rect width="100%" height="100%" fill="#333"/>
    ${labelSvgParts.join("\n    ")}
  </svg>`;
  const labelBuffer = await sharp(Buffer.from(labelSvg)).png().toBuffer();

  // Render each variant row
  const variantResults = [];
  for (const row of variantRows) {
    const result = await compositeGroup(row, testCanvas, { forceOneRow: true });
    if (result) variantResults.push(result);
  }

  // Stack: control row, label bar, then variant rows
  if (controlResult && variantResults.length > 0) {
    const totalH = testRowH + labelHeight + testRowH * variantResults.length;
    const compositeOps = [
      { input: controlResult, top: 0, left: 0 },
      { input: labelBuffer, top: testRowH, left: 0 },
    ];
    variantResults.forEach((buf, i) => {
      compositeOps.push({
        input: buf,
        top: testRowH + labelHeight + i * testRowH,
        left: 0,
      });
    });

    const testResult = await sharp({
      create: {
        width: testCanvasW,
        height: totalH,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite(compositeOps)
      .png()
      .toBuffer();

    const testPath = path.join(OUTPUT_DIR, "_test_all_characters.png");
    await writeFile(testPath, testResult);
    console.log(`  ✓ _test_all_characters.png (${numChars} characters — control + ${variantResults.length} variants)`);
  }

  console.log("Done!\n");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
