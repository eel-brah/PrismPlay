export interface Paddle {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
}

export interface Ball {
  x: number;
  y: number;
  radius: number;
  speedX: number;
  speedY: number;
}

export interface CanvasSize {
  width: number;
  height: number;
}
