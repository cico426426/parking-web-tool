import { buildTdxParkingUrls } from "./src/parking/city.js";
import { buildAvailabilityMap, normalizeCarParks } from "./src/parking/normalize.js";
import { rankRecommendations } from "./src/parking/rank.js";

const CLIENT_ID = process.env.TDX_ID;
const CLIENT_SECRET = process.env.TDX_SECRET;

const CITY = process.env.PARKING_CITY ?? "Taoyuan";
const DESTINATION = {
  id: "zhongli-station",
  name: "中壢火車站",
  lat: Number(process.env.DEST_LAT ?? 24.9536),
  lng: Number(process.env.DEST_LNG ?? 121.2251),
  source: "preset",
};

const TOKEN_URL =
  "https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token";

async function getToken() {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "client_credentials",
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch token: ${response.status} ${response.statusText}`);
  }

  return (await response.json()).access_token;
}

async function getJson(url, token) {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch data from ${url}: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

function writeDataFile(payload) {
  const serialized = JSON.stringify(payload, null, 2);
  return import("node:fs").then((fs) => {
    fs.writeFileSync("data.js", `window.PARKING_APP_DATA = ${serialized};\n`);
  });
}

async function main() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error("TDX_ID and TDX_SECRET environment variables must be set.");
  }

  const token = await getToken();
  const urls = buildTdxParkingUrls(CITY);
  const [carParkData, availabilityData] = await Promise.all([
    getJson(urls.carParks, token),
    getJson(urls.availability, token),
  ]);

  const parkingLots = normalizeCarParks(carParkData, CITY);
  const availabilityById = buildAvailabilityMap(availabilityData);
  const recommendations = rankRecommendations(DESTINATION, parkingLots, availabilityById, { limit: 3 });
  const availability = Object.fromEntries(availabilityById);

  const payload = {
    destination: DESTINATION,
    city: CITY,
    generatedAt: new Date().toISOString(),
    dataFreshness: "snapshot",
    parkingLotsCount: parkingLots.length,
    parkingLots,
    availability,
    recommendations,
    warnings: buildWarnings(recommendations),
  };

  await writeDataFile(payload);

  console.log(`Car parks loaded: ${parkingLots.length}`);
  console.log("\n=== 推薦停這幾個 ===");
  for (const recommendation of recommendations) {
    const spaces = formatAvailability(recommendation.availability);
    const distance = `${Math.round(recommendation.distanceMeters)} m`;
    const minutes = recommendation.timeEstimateMinutes
      ? `${recommendation.timeEstimateMinutes} 分鐘估計`
      : "時間未知";
    console.log(`${recommendation.rank}. ${recommendation.parkingLot.name}｜${distance}｜${minutes}｜${spaces}`);
  }
  console.log("\n已寫出 data.js");
}

function buildWarnings(recommendations) {
  const warnings = [];
  if (recommendations.length === 0) warnings.push("NO_USABLE_PARKING");
  if (recommendations.some((item) => item.availability.status === "unknown")) {
    warnings.push("UNKNOWN_AVAILABILITY");
  }
  if (recommendations.length > 0 && recommendations.every((item) => item.availability.status === "full")) {
    warnings.push("ALL_FULL");
  }
  return warnings;
}

function formatAvailability(availability) {
  if (!availability || availability.status === "unknown") return "空位未知";
  if (availability.status === "full") return "已滿";
  if (availability.status === "closed") return "未開放";
  return `剩 ${availability.availableSpaces} 位`;
}

main().catch((error) => {
  console.error("Error fetching parking data:", error.message);
  process.exitCode = 1;
});
