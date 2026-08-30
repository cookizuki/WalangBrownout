import type { DriftWallItem } from "@/components/DriftWall";

function svgTile(bg: string, icon: string, label: string): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
      <rect width="600" height="400" fill="${bg}"/>
      <g transform="translate(240,120)" fill="none" stroke="#ffffff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity="0.92">
        ${icon}
      </g>
      <text x="300" y="330" font-family="Helvetica, Arial, sans-serif" font-size="26" font-weight="700" fill="#ffffff" text-anchor="middle" opacity="0.95">${label}</text>
    </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const PRODUCT_TILES: DriftWallItem[] = [
  { title: "Portable AC Unit", image: "/images/Aircon.jfif" },
  { title: "Air Purifier", image: "/images/AirPurifier.jfif" },
  { title: "Smart Thermostat", image: "/images/Thermostat.jfif" },
  { title: "Carbon Filter", image: "/images/Filter.jfif" },
  { title: "Tower Fan", image: "/images/TowerFan.jfif" },
  { title: "Humidity Sensor", image: "/images/HumiditySensor.jfif" },
];