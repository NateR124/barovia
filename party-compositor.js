import sharp from "sharp";
import { createHash } from "crypto";
import { readFile, writeFile, access, mkdir } from "fs/promises";
import path from "path";

// ---------------------------------------------------------------------------
// CONFIG
// ---------------------------------------------------------------------------

const CANVAS = { width: 800, height: 600 };
const CACHE_DIR = "./cache/party-images";

// Layout tuning knobs — tweak these to taste
const LAYOUT = {
  paddingTop: 0.08,       // % of canvas height reserved at top
  paddingBottom: 0.05,    // % of canvas height reserved at bottom
  minVerticalGap: 30,     // px — minimum y distance between z-layers
  horizontalSpread: 0.55, // % of canvas width used for left/right spread
  zigzagDecay: 0.85,      // each successive zigzag ring shrinks by this factor
  scaleBack: 0.85,        // characters in the very back are scaled down to this
  scaleFront: 1.0,        // characters in the very front are full size
};

// ---------------------------------------------------------------------------
// LAYOUT ALGORITHM
//
// Goals:
//   1. Higher z-index → lower on canvas (in front, closer to viewer)
//   2. Every character's face stays visible — no direct vertical stacking
//   3. Automatic — caller just passes a list of { id, zIndex, asset }
//
// Approach:
//   - Sort back-to-front by zIndex
//   - Y maps linearly: low z → top of canvas, high z → bottom
//   - X uses a zigzag pattern from center so adjacent z-layers
//     alternate sides, creating a natural chevron / diamond formation
//   - Optional depth-based scaling: back chars slightly smaller
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} PartyMember
 * @property {string} id          - unique identifier, e.g. "knight"
 * @property {number} zIndex      - 0 = far back, higher = more in front
 * @property {string} assetPath   - path to the character's transparent PNG
 * @property {number} [width]     - asset width  (populated during layout)
 * @property {number} [height]    - asset height (populated during layout)
 */

/**
 * Calculate automatic positions for each party member.
 * Returns members sorted back-to-front with { x, y, scale } attached.
 */
async function calculateLayout(members, canvas = CANVAS) {
  // 1. Read each asset's dimensions so we can center them properly
  const withMeta = await Promise.all(
    members.map(async (m) => {
      const meta = await sharp(m.assetPath).metadata();
      return { ...m, width: meta.width, height: meta.height };
    })
  );

  // 2. Sort back-to-front (low zIndex first → rendered first → behind)
  const sorted = [...withMeta].sort((a, b) => a.zIndex - b.zIndex);
  const count = sorted.length;

  // 3. Vertical distribution
  const topY = canvas.height * LAYOUT.paddingTop;
  const bottomY = canvas.height * (1 - LAYOUT.paddingBottom);
  const availableHeight = bottomY - topY;

  // Make sure we respect the minimum vertical gap
  const naturalStep = count > 1 ? availableHeight / (count - 1) : 0;
  const verticalStep = Math.max(naturalStep, LAYOUT.minVerticalGap);

  // 4. Horizontal zigzag from center
  //    Pattern: center, right, left, right, left...
  //    Each "ring" out from center gets a slightly smaller offset (zigzagDecay)
  //    so the formation tapers into a diamond rather than a rectangle.
  const centerX = canvas.width / 2;
  const maxSpread = (canvas.width * LAYOUT.horizontalSpread) / 2;

  sorted.forEach((member, i) => {
    // --- Y position ---
    const t = count > 1 ? i / (count - 1) : 0.5;
    const rawY = topY + t * availableHeight;

    // --- Depth scale ---
    const scale = LAYOUT.scaleBack + t * (LAYOUT.scaleFront - LAYOUT.scaleBack);
    const scaledW = Math.round(member.width * scale);
    const scaledH = Math.round(member.height * scale);

    // --- X position (zigzag) ---
    //  i=0 → center (back, top)
    //  i=1 → right
    //  i=2 → left
    //  i=3 → right (smaller offset)
    //  ...
    let offsetX = 0;
    if (i > 0) {
      const ring = Math.ceil(i / 2);                          // which ring out from center
      const direction = i % 2 === 1 ? 1 : -1;                 // alternate right/left
      const magnitude = (ring / Math.ceil(count / 2)) * maxSpread;
      offsetX = direction * magnitude * Math.pow(LAYOUT.zigzagDecay, ring - 1);
    }

    const x = Math.round(centerX + offsetX - scaledW / 2);
    const y = Math.round(rawY - scaledH / 2);

    member.x = x;
    member.y = y;
    member.scale = scale;
    member.scaledW = scaledW;
    member.scaledH = scaledH;
  });

  return sorted;
}

// ---------------------------------------------------------------------------
// COMPOSITOR
// ---------------------------------------------------------------------------

/**
 * Composite the party into a single PNG buffer.
 */
async function compositeParty(members, canvas = CANVAS) {
  const laid = await calculateLayout(members, canvas);

  // Build the Sharp composite operations (back-to-front order)
  const compositeOps = await Promise.all(
    laid.map(async (m) => {
      const resized = await sharp(m.assetPath)
        .resize(m.scaledW, m.scaledH, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();

      return {
        input: resized,
        top: Math.max(0, m.y),
        left: Math.max(0, m.x),
      };
    })
  );

  const result = await sharp({
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

  return result;
}

// ---------------------------------------------------------------------------
// CACHING
// ---------------------------------------------------------------------------

function getCacheKey(members, canvas) {
  // Deterministic hash of member IDs + z-order + canvas size
  const payload = JSON.stringify({
    members: members.map((m) => ({ id: m.id, z: m.zIndex })).sort((a, b) => a.id.localeCompare(b.id)),
    canvas,
  });
  return createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

async function ensureCacheDir() {
  try {
    await access(CACHE_DIR);
  } catch {
    await mkdir(CACHE_DIR, { recursive: true });
  }
}

/**
 * Get (or generate + cache) the composited party image.
 * Returns a PNG buffer.
 */
async function getPartyImage(members, canvas = CANVAS) {
  await ensureCacheDir();
  const key = getCacheKey(members, canvas);
  const cachePath = path.join(CACHE_DIR, `${key}.png`);

  try {
    await access(cachePath);
    return await readFile(cachePath);
  } catch {
    // Cache miss — composite and store
    const buffer = await compositeParty(members, canvas);
    await writeFile(cachePath, buffer);
    return buffer;
  }
}

// ---------------------------------------------------------------------------
// EXPRESS ENDPOINT EXAMPLE
// ---------------------------------------------------------------------------
// Drop this into your existing Express app, or run standalone.

/*
import express from "express";
const app = express();

// Your character asset registry — could come from DB, JSON file, etc.
const CHARACTERS = {
  knight:    { assetPath: "./assets/knight.png" },
  rogue:     { assetPath: "./assets/rogue.png" },
  elf:       { assetPath: "./assets/elf.png" },
  wizard:    { assetPath: "./assets/wizard.png" },
  ghost:     { assetPath: "./assets/ghost.png" },
  puppet:    { assetPath: "./assets/puppet.png" },
  summon:    { assetPath: "./assets/summon.png" },
};

// GET /api/party-image?members=ghost,wizard,knight,elf,rogue
//
// Members are listed back-to-front — first in the list = furthest back.
// This way the URL order IS the z-order, no separate param needed.
app.get("/api/party-image", async (req, res) => {
  try {
    const ids = (req.query.members || "").split(",").filter(Boolean);
    if (ids.length === 0) return res.status(400).send("No members specified");

    // Map to PartyMember objects — z-index = position in the list
    const members = ids.map((id, i) => {
      const char = CHARACTERS[id];
      if (!char) throw new Error(`Unknown character: ${id}`);
      return { id, zIndex: i, assetPath: char.assetPath };
    });

    const png = await getPartyImage(members);

    res.set({
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400, immutable",
    });
    res.send(png);
  } catch (err) {
    console.error("Party image error:", err);
    res.status(500).send("Failed to generate party image");
  }
});

app.listen(3001, () => console.log("Party compositor running on :3001"));
*/

// ---------------------------------------------------------------------------
// STANDALONE TEST
// ---------------------------------------------------------------------------

export { calculateLayout, compositeParty, getPartyImage, getCacheKey };