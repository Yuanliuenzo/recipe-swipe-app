/**
 * Restaurant ingestion script — Amsterdam
 *
 * Fetches restaurant data from OpenStreetMap via the Overpass API,
 * generates semantic embeddings using Ollama nomic-embed-text,
 * and stores everything in SQLite for RAG-based vibe matching.
 *
 * Usage:
 *   node scripts/ingest-restaurants.js
 *   node scripts/ingest-restaurants.js --force   # re-embed all existing rows
 *
 * Requires Ollama running with nomic-embed-text pulled:
 *   ollama pull nomic-embed-text
 */

import db from "../db/database.js";
import { ollamaEmbed } from "../ai/providers/ollama.js";

// ─── Config ───────────────────────────────────────────────────────────────────

const FORCE_REEMBED = process.argv.includes("--force");
const CONCURRENCY = 4; // parallel embedding requests
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

// Amsterdam bounding box: south, west, north, east
const AMSTERDAM_BBOX = "52.278,4.729,52.431,5.079";

// ─── Cuisine → vibe description mapping ──────────────────────────────────────
// Enriches sparse OSM data with semantically rich descriptions
// so embeddings capture mood/atmosphere, not just cuisine labels.

const CUISINE_VIBES = {
  dutch:
    "traditional Dutch cuisine. Warm, hearty, homey comfort food. Stamppot, erwtensoep, bitterballen. Cozy brown café atmosphere, convivial and nostalgic.",
  indonesian:
    "Indonesian cuisine. Aromatic, spiced, bold layers of flavor. Rijsttafel, satay, rendang, nasi goreng. Adventurous, exotic, communal sharing.",
  surinamese:
    "Surinamese food. Bold, multicultural flavors. Roti, pom, moksi alesi. Warm spiced stews. Adventurous and soul-satisfying.",
  turkish:
    "Turkish cuisine. Bold, generous, aromatic. Grilled meats, mezze, fresh bread, mint tea. Lively and communal.",
  moroccan:
    "Moroccan cuisine. Warm spices, saffron, cumin, coriander. Tagines, couscous, mint tea. Slow-cooked, comforting, fragrant, and exotic.",
  italian:
    "Italian cuisine. Warm, convivial, rustic. Pasta, pizza, risotto, tiramisu. Rich with olive oil and herbs. Cozy and generous.",
  french:
    "French cuisine. Elegant, refined, indulgent. Bistro classics, wine, butter, herbs. Bistro warmth with fine-dining precision.",
  japanese:
    "Japanese cuisine. Clean, precise, umami-forward. Sushi, ramen, yakitori. Minimal and zen. Calm, restorative, delicate flavors.",
  chinese:
    "Chinese cuisine. Bold, varied, communal. Dim sum, Peking duck, stir-fry. Rich flavors, family-style sharing.",
  vietnamese:
    "Vietnamese cuisine. Fresh, light, herbaceous, bright. Pho, bánh mì, fresh spring rolls. Clean and energizing.",
  thai: "Thai cuisine. Bold, spicy, fragrant, vibrant. Pad thai, curries, lemongrass. Exciting and punchy.",
  korean:
    "Korean cuisine. Bold, fermented, spicy, communal. BBQ, bibimbap, kimchi. Adventurous and social.",
  indian:
    "Indian cuisine. Rich, spiced, complex, warming. Curries, tandoor, naan. Deeply comforting and aromatic.",
  mediterranean:
    "Mediterranean cuisine. Fresh, light, vibrant. Hummus, grilled fish, salads, olive oil. Sunny and wholesome.",
  greek:
    "Greek cuisine. Simple, honest, generous. Grilled meats, mezze, feta, lamb. Convivial and warm.",
  spanish:
    "Spanish cuisine. Vibrant, social, indulgent. Tapas, patatas bravas, jamón, paella. Lively and generous.",
  mexican:
    "Mexican cuisine. Bold, vibrant, festive. Tacos, mole, guacamole. Punchy flavors and communal warmth.",
  american:
    "American cuisine. Hearty, indulgent, satisfying. Burgers, ribs, craft beer. Casual and comforting.",
  middle_eastern:
    "Middle Eastern cuisine. Aromatic, mezze-style, sharing. Falafel, shawarma, hummus, flatbread. Warm and convivial.",
  african:
    "African cuisine. Bold, earthy, hearty stews. Tagines, jollof, berbere spices. Adventurous and soul-warming.",
  caribbean:
    "Caribbean cuisine. Vibrant, spiced, tropical. Jerk chicken, rice and peas, plantains. Lively and celebratory.",
  seafood:
    "Seafood restaurant. Fresh ocean flavors. Fish, shellfish, oysters. Light and clean or indulgent and rich.",
  vegetarian:
    "Vegetarian restaurant. Fresh, vibrant, plant-based. Creative vegetable dishes. Light, nourishing, wholesome.",
  vegan:
    "Vegan restaurant. Plant-based, creative, fresh. Colorful bowls, vegetables, whole grains. Clean and mindful.",
  sushi:
    "Sushi bar. Precise, minimalist, umami-rich. Fresh fish, clean rice, wasabi. Calm and refined.",
  ramen:
    "Ramen restaurant. Deep, warming, umami-rich broth. Noodles, soft egg, toppings. Cozy, restorative.",
  burger:
    "Burger restaurant. Hearty, indulgent, satisfying. Juicy patties, crispy fries, craft beer. Casual comfort.",
  pizza:
    "Pizza restaurant. Casual, convivial, generous. Wood-fired crust, melted cheese, tomato. Comfortable and sharing.",
  steak:
    "Steakhouse. Hearty, indulgent, celebratory. Aged beef, wine, candlelight. Special occasion or treat-yourself energy.",
  seafood_dutch:
    "Dutch seafood. Herring, kibbeling, mussels. Fresh, briny, coastal flavors. Light and authentic.",
  fusion:
    "Fusion cuisine. Creative, adventurous, unexpected. Mix of global flavors. Exciting and modern."
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCuisineVibe(cuisine) {
  if (!cuisine) {
    return "";
  }
  const key = cuisine
    .toLowerCase()
    .replace(/[^a-z_]/g, "_")
    .split(";")[0];
  return CUISINE_VIBES[key] || `${cuisine} cuisine.`;
}

function buildDescription(element) {
  const tags = element.tags || {};
  const name = tags.name || "Unnamed restaurant";
  const cuisine = tags.cuisine || "";
  const neighborhood =
    tags["addr:neighbourhood"] ||
    tags["addr:suburb"] ||
    tags["addr:city_block"] ||
    "";
  const street = tags["addr:street"]
    ? `${tags["addr:street"]} ${tags["addr:housenumber"] || ""}`.trim()
    : "";
  const openingHours = tags.opening_hours ? `Open: ${tags.opening_hours}.` : "";
  const outdoorSeating =
    tags.outdoor_seating === "yes" ? "Outdoor seating available." : "";
  const takeaway = tags.takeaway === "yes" ? "Takeaway available." : "";

  const cuisineVibe = getCuisineVibe(cuisine);

  const parts = [
    name,
    cuisine
      ? `is a ${cuisine.replace(/;/g, " and ")} restaurant`
      : "is a restaurant",
    neighborhood ? `in ${neighborhood}, Amsterdam` : "in Amsterdam",
    ".",
    street ? `Address: ${street}.` : "",
    cuisineVibe,
    openingHours,
    outdoorSeating,
    takeaway
  ].filter(Boolean);

  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function extractCoords(element) {
  if (element.type === "node") {
    return { lat: element.lat, lng: element.lon };
  }
  if (element.center) {
    return { lat: element.center.lat, lng: element.center.lon };
  }
  return null;
}

// ─── Overpass fetch ───────────────────────────────────────────────────────────

async function fetchAmsterdamRestaurants() {
  console.log("🌍 Fetching Amsterdam restaurants from Overpass API...");

  const query = `
[out:json][timeout:60];
(
  node["amenity"="restaurant"](${AMSTERDAM_BBOX});
  way["amenity"="restaurant"](${AMSTERDAM_BBOX});
);
out center tags;
  `.trim();

  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
    signal: AbortSignal.timeout(90000)
  });

  if (!res.ok) {
    throw new Error(`Overpass API ${res.status}: ${res.statusText}`);
  }

  const data = await res.json();
  console.log(`✅ Fetched ${data.elements.length} restaurant elements`);
  return data.elements;
}

// ─── Embedding batch runner ───────────────────────────────────────────────────

async function embedBatch(items) {
  const results = await Promise.allSettled(
    items.map(async item => {
      const vec = await ollamaEmbed(item.description);
      return { ...item, embedding: vec };
    })
  );

  return results
    .map((r, i) => {
      if (r.status === "rejected") {
        console.warn(
          `⚠️  Embedding failed for "${items[i].name}": ${r.reason.message}`
        );
        return null;
      }
      return r.value;
    })
    .filter(Boolean);
}

// ─── Main ingestion ───────────────────────────────────────────────────────────

async function ingest() {
  // Check if nomic-embed-text is available
  console.log("🔍 Checking Ollama nomic-embed-text availability...");
  try {
    await ollamaEmbed("test");
    console.log("✅ Ollama embedding model ready");
  } catch (err) {
    console.error(
      "❌ Ollama embed failed. Make sure Ollama is running and nomic-embed-text is pulled:"
    );
    console.error("   ollama pull nomic-embed-text");
    console.error(`   Error: ${err.message}`);
    process.exit(1);
  }

  const elements = await fetchAmsterdamRestaurants();

  // Filter: must have a name and valid coordinates
  const valid = elements.filter(el => {
    const coords = extractCoords(el);
    return el.tags?.name && coords;
  });

  console.log(`📍 ${valid.length} restaurants with names and coordinates`);

  if (FORCE_REEMBED) {
    console.log("🔄 --force: clearing existing restaurant data");
    db.prepare("DELETE FROM restaurants").run();
  }

  // Get existing IDs to skip
  const existingIds = new Set(
    db
      .prepare("SELECT id FROM restaurants")
      .all()
      .map(r => r.id)
  );
  console.log(`📋 ${existingIds.size} restaurants already in DB`);

  // Build records
  const toProcess = valid
    .map(el => {
      const coords = extractCoords(el);
      const tags = el.tags || {};
      const id = `osm-${el.type}-${el.id}`;

      if (existingIds.has(id)) {
        return null;
      }

      return {
        id,
        name: tags.name,
        cuisine: tags.cuisine || null,
        lat: coords.lat,
        lng: coords.lng,
        address:
          [tags["addr:street"], tags["addr:housenumber"]]
            .filter(Boolean)
            .join(" ") || null,
        neighborhood: tags["addr:neighbourhood"] || tags["addr:suburb"] || null,
        description: buildDescription(el),
        osm_tags: JSON.stringify(tags)
      };
    })
    .filter(Boolean);

  console.log(`🆕 ${toProcess.length} new restaurants to embed and store`);

  if (toProcess.length === 0) {
    console.log("✅ Nothing to do. Run with --force to re-embed all.");
    return;
  }

  // Insert statement
  const insert = db.prepare(`
    INSERT OR REPLACE INTO restaurants
      (id, name, cuisine, lat, lng, address, neighborhood, description, embedding, osm_tags)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let processed = 0;
  let failed = 0;

  // Process in batches of CONCURRENCY
  for (let i = 0; i < toProcess.length; i += CONCURRENCY) {
    const batch = toProcess.slice(i, i + CONCURRENCY);
    const embedded = await embedBatch(batch);

    const insertMany = db.transaction(items => {
      for (const item of items) {
        const buf = Buffer.from(item.embedding.buffer);
        insert.run(
          item.id,
          item.name,
          item.cuisine,
          item.lat,
          item.lng,
          item.address,
          item.neighborhood,
          item.description,
          buf,
          item.osm_tags
        );
      }
    });

    insertMany(embedded);
    processed += embedded.length;
    failed += batch.length - embedded.length;

    if (processed % 50 === 0 || i + CONCURRENCY >= toProcess.length) {
      const pct = Math.round((processed / toProcess.length) * 100);
      console.log(
        `⚙️  ${processed}/${toProcess.length} (${pct}%) embedded and stored`
      );
    }
  }

  const total = db.prepare("SELECT COUNT(*) as n FROM restaurants").get().n;
  console.log(`\n✅ Ingestion complete!`);
  console.log(`   Stored:  ${processed} new restaurants`);
  console.log(`   Failed:  ${failed}`);
  console.log(`   Total in DB: ${total}`);
}

ingest().catch(err => {
  console.error("❌ Ingestion failed:", err);
  process.exit(1);
});
