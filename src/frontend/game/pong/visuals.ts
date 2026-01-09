// Theme definitions
export interface GameTheme {
  id: string;
  name: string;
  background: string;
  backgroundGradient?: (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ) => void;
  centerLine: string;
  centerLineStyle: "dashed" | "solid" | "dots" | "glow";
  textColor: string;
  scoreColor: string;
  comboColor: string;
  glowEnabled: boolean;
}

export const THEMES: GameTheme[] = [
  {
    id: "classic",
    name: "Classic",
    background: "#1e1e2e",
    centerLine: "rgba(137, 180, 250, 0.5)",
    centerLineStyle: "dashed",
    textColor: "#cdd6f4",
    scoreColor: "#cdd6f4",
    comboColor: "#f9e2af",
    glowEnabled: true,
  },
  {
    id: "neon",
    name: "Neon",
    background: "#0a0a0f",
    backgroundGradient: (ctx, w, h) => {
      const grad = ctx.createRadialGradient(
        w / 2,
        h / 2,
        0,
        w / 2,
        h / 2,
        w / 2
      );
      grad.addColorStop(0, "#1a0a2e");
      grad.addColorStop(1, "#0a0a0f");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    },
    centerLine: "#ff00ff",
    centerLineStyle: "glow",
    textColor: "#00ffff",
    scoreColor: "#ff00ff",
    comboColor: "#00ff00",
    glowEnabled: true,
  },
  {
    id: "retro",
    name: "Retro",
    background: "#000000",
    centerLine: "#ffffff",
    centerLineStyle: "dots",
    textColor: "#ffffff",
    scoreColor: "#ffffff",
    comboColor: "#ffff00",
    glowEnabled: false,
  },
  {
    id: "ocean",
    name: "Ocean",
    background: "#0c1929",
    backgroundGradient: (ctx, w, h) => {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, "#0c1929");
      grad.addColorStop(0.5, "#1a3a5c");
      grad.addColorStop(1, "#0c1929");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    },
    centerLine: "#4ecdc4",
    centerLineStyle: "solid",
    textColor: "#a8e6cf",
    scoreColor: "#4ecdc4",
    comboColor: "#ff6b6b",
    glowEnabled: true,
  },
];

// Color presets
export const PADDLE_COLORS = [
  { name: "Blue", value: "#89b4fa" },
  { name: "Purple", value: "#cba6f7" },
  { name: "Pink", value: "#f5c2e7" },
  { name: "Red", value: "#f38ba8" },
  { name: "Orange", value: "#fab387" },
  { name: "Yellow", value: "#f9e2af" },
  { name: "Green", value: "#a6e3a1" },
  { name: "Teal", value: "#94e2d5" },
  { name: "Cyan", value: "#00ffff" },
  { name: "White", value: "#ffffff" },
];

export const BALL_COLORS = [
  { name: "Cream", value: "#f5e0dc" },
  { name: "White", value: "#ffffff" },
  { name: "Yellow", value: "#f9e2af" },
  { name: "Orange", value: "#fab387" },
  { name: "Pink", value: "#f5c2e7" },
  { name: "Cyan", value: "#00ffff" },
  { name: "Green", value: "#a6e3a1" },
  { name: "Red", value: "#f38ba8" },
];
