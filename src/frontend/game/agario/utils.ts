import { Camera } from "src/shared/agario/types";

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
) {
  const gridSize = 50;

  const startX = -(camera.x % gridSize);
  const startY = -(camera.y % gridSize);

  const width = camera.width;
  const height = camera.height;

  ctx.strokeStyle = "#b8c1c5";
  ctx.lineWidth = 1;

  for (let x = startX; x < width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  for (let y = startY; y < height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(0 + width, y);
    ctx.stroke();
  }
}
