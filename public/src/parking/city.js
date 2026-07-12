export const CITY_MAPPING = {
  Taipei: "台北市",
  NewTaipei: "新北市",
  Taoyuan: "桃園市",
  Taichung: "台中市",
  Tainan: "台南市",
  Kaohsiung: "高雄市",
  Keelung: "基隆市",
  Hsinchu: "新竹市",
  HsinchuCounty: "新竹縣",
  MiaoliCounty: "苗栗縣",
  ChanghuaCounty: "彰化縣",
  NantouCounty: "南投縣",
  YunlinCounty: "雲林縣",
  Chiayi: "嘉義市",
  ChiayiCounty: "嘉義縣",
  PingtungCounty: "屏東縣",
  YilanCounty: "宜蘭縣",
  HualienCounty: "花蓮縣",
  TaitungCounty: "台東縣",
  PenghuCounty: "澎湖縣",
  KinmenCounty: "金門縣",
  LienchiangCounty: "連江縣",
};

const CITY_ALIASES = new Map(
  Object.entries(CITY_MAPPING).flatMap(([key, name]) => {
    const aliases = [name, name.replace("台", "臺")];
    if (key === "NewTaipei") aliases.push("新北", "新北市");
    if (key === "Taipei") aliases.push("台北", "臺北", "台北市", "臺北市");
    if (key === "Taoyuan") aliases.push("桃園", "桃園市");
    return aliases.map((alias) => [alias, key]);
  }),
);

const DISTRICT_ALIASES = new Map([
  ["板橋", "NewTaipei"],
  ["三重", "NewTaipei"],
  ["新莊", "NewTaipei"],
  ["蘆洲", "NewTaipei"],
  ["淡水", "NewTaipei"],
  ["林口", "NewTaipei"],
  ["中壢", "Taoyuan"],
]);

const CITY_BOUNDS = {
  Taoyuan: { minLat: 24.55, maxLat: 25.15, minLng: 120.95, maxLng: 121.55 },
  Taipei: { minLat: 24.95, maxLat: 25.25, minLng: 121.5, maxLng: 121.7 },
  NewTaipei: { minLat: 24.65, maxLat: 25.35, minLng: 121.25, maxLng: 122.05 },
};

const CITY_INFERENCE_ORDER = ["Taipei", "NewTaipei", "Taoyuan"];
const CITY_CANDIDATE_PADDING = 0.08;

export function isSupportedCity(city) {
  return Object.hasOwn(CITY_MAPPING, city);
}

export function getCityName(city) {
  return CITY_MAPPING[city] ?? city;
}

export function inferCityFromAddress(address, fallback = null) {
  if (!address) return fallback;

  const candidates = [
    address.city,
    address.town,
    address.county,
    address.state,
    address.state_district,
    address["ISO3166-2-lvl4"],
  ].filter(Boolean);

  for (const candidate of candidates) {
    const city = cityKeyFromText(candidate);
    if (city) return city;
  }

  return fallback;
}

export function cityKeyFromText(text) {
  const normalized = String(text ?? "").trim();
  if (!normalized) return null;

  if (isSupportedCity(normalized)) return normalized;
  if (CITY_ALIASES.has(normalized)) return CITY_ALIASES.get(normalized);

  for (const [alias, key] of CITY_ALIASES) {
    if (normalized.includes(alias)) return key;
  }

  for (const [alias, key] of DISTRICT_ALIASES) {
    if (normalized.includes(alias)) return key;
  }

  return null;
}

export function getCityBounds(city) {
  return CITY_BOUNDS[city] ?? null;
}

export function inferCityFromCoordinates(lat, lng, fallback = "Taoyuan") {
  return inferCitiesFromCoordinates(lat, lng, fallback)[0] ?? fallback;
}

export function inferCitiesFromCoordinates(lat, lng, fallback = "Taoyuan") {
  const matches = matchingCitiesFromCoordinates(lat, lng);
  if (matches.length) return matches;
  return fallback ? [fallback] : [];
}

export function candidateCitiesFromCoordinates(lat, lng, fallback = "Taoyuan") {
  const strictMatches = matchingCitiesFromCoordinates(lat, lng);
  const nearbyMatches = matchingCitiesFromCoordinates(lat, lng, CITY_CANDIDATE_PADDING);
  const matches = [...new Set([...strictMatches, ...nearbyMatches])];
  if (matches.length) return matches;
  return fallback ? [fallback] : [];
}

function matchingCitiesFromCoordinates(lat, lng, padding = 0) {
  const pointLat = Number(lat);
  const pointLng = Number(lng);

  if (!Number.isFinite(pointLat) || !Number.isFinite(pointLng)) {
    return [];
  }

  const matches = [];
  for (const city of CITY_INFERENCE_ORDER) {
    const bounds = CITY_BOUNDS[city];
    if (
      pointLat >= bounds.minLat - padding &&
      pointLat <= bounds.maxLat + padding &&
      pointLng >= bounds.minLng - padding &&
      pointLng <= bounds.maxLng + padding
    ) {
      matches.push(city);
    }
  }

  return matches;
}

export function buildTdxParkingUrls(city, options = {}) {
  if (!isSupportedCity(city)) {
    throw new Error(`Unsupported city: ${city}`);
  }

  const base = "https://tdx.transportdata.tw/api/basic/v1/Parking/OffStreet";
  const carParks = new URL(`${base}/CarPark/City/${city}`);
  const availability = new URL(`${base}/ParkingAvailability/City/${city}`);
  carParks.searchParams.set("$format", "JSON");
  availability.searchParams.set("$format", "JSON");

  if (Number.isFinite(options.lat) && Number.isFinite(options.lng)) {
    const radiusMeters = Number(options.radiusMeters ?? 3000);
    carParks.searchParams.set(
      "$spatialFilter",
      `nearby(CarParkPosition,${options.lat},${options.lng},${radiusMeters})`,
    );
  }

  return {
    carParks: carParks.toString(),
    availability: availability.toString(),
  };
}
