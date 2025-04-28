export const ALERT_TYPES = [
  { key: "TOR", label: "TORNADO WARNING", color: "bg-red-600" },
  { key: "TOR_EMERGENCY", label: "TORNADO EMERGENCY", color: "bg-purple-600" },
  { key: "SVR", label: "SEVERE T-STORM WARNING", color: "bg-yellow-500" },
  { key: "FFW", label: "FLASH FLOOD WARNING", color: "bg-green-500" },
  { key: "WSW", label: "WINTER STORM WARNING", color: "bg-blue-500" },
  { key: "TOA", label: "TORNADO WATCH", color: "bg-pink-500" },
  { key: "SVA", label: "SEVERE T-STORM WATCH", color: "bg-orange-500" },
];

export const colorMap: { [key: string]: { base: string; light: string } } = {
  "bg-red-600": { base: "bg-red-600", light: "bg-red-400" },
  "bg-yellow-500": { base: "bg-yellow-500", light: "bg-yellow-300" },
  "bg-green-500": { base: "bg-green-500", light: "bg-green-300" },
  "bg-blue-500": { base: "bg-blue-500", light: "bg-blue-300" },
  "bg-pink-500": { base: "bg-pink-500", light: "bg-pink-300" },
  "bg-orange-500": { base: "bg-orange-500", light: "bg-orange-300" },
  "bg-purple-600": { base: "bg-purple-600", light: "bg-purple-400" },
  "default": { base: "bg-neutral-700", light: "bg-neutral-500" },
}; 