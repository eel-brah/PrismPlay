import {
  INIT_RADIUS,
  MAP_HEIGHT,
  MAP_WIDTH,
  MAX_SPEED,
  MIN_SPEED,
  ORB_RADIUS,
} from "./config.js";
import { Camera, Mouse, Orb, PlayerData } from "./types.js";
import { darkenHex } from "./utils.js";

export class Player {
  private _id: string;
  private _name: string;
  private _x: number;
  private _y: number;
  private _radius: number;
  private _color: string;

  constructor(id: string, name: string, x: number, y: number, color: string) {
    this._id = id;
    this._name = name;
    this._x = x;
    this._y = y;
    this._radius = INIT_RADIUS;
    this._color = color;
  }

  get x(): number {
    return this._x;
  }
  set x(x: number) {
    this._x = x;
  }

  get y(): number {
    return this._y;
  }
  set y(y: number) {
    this._y = y;
  }

  get radius(): number {
    return this._radius;
  }
  set radius(radius: number) {
    this._radius = radius;
  }

  get name(): string {
    return this._name;
  }

  get id(): string {
    return this._id;
  }
  get color(): string {
    return this._color;
  }

  serialize() {
    return {
      id: this._id,
      name: this._name,
      x: this._x,
      y: this._y,
      radius: this._radius,
      color: this._color,
    };
  }

  static deserialize(data: PlayerData): Player {
    const p = new Player(data.id, data.name, data.x, data.y, data.color);
    p.radius = data.radius;
    return p;
  }

  update(dt: number, mouse: Mouse, orbs: Orb[]): string[] {
    const dx = mouse.x - this._x;
    const dy = mouse.y - this._y;
    const distance = Math.hypot(dx, dy);

    if (distance > 1) {
      const dirX = dx / distance;
      const dirY = dy / distance;

      //TODO: improve
      const baseSpeed = Math.min(MAX_SPEED, Math.max(MIN_SPEED, distance * 2));
      const sizeFactor = this.radius / INIT_RADIUS;
      const speed = baseSpeed / sizeFactor;

      // const baseSpeed = Math.min(MAX_SPEED, Math.max(MIN_SPEED, distance * 2));
      // const speed = baseSpeed / Math.log(this.radius );

      this._x += dirX * speed * dt;
      this._y += dirY * speed * dt;
    }

    const eatenOrbs: string[] = [];
    for (const orb of orbs) {
      const odx = orb.x - this._x;
      const ody = orb.y - this._y;
      const odistance = Math.hypot(odx, ody);

      if (odistance < this._radius + orb.radius) {
        eatenOrbs.push(orb.id);

        //TODO: update max
        if (this._radius < 200) {
          const sum =
            Math.PI * this._radius * this._radius +
            Math.PI * ORB_RADIUS * ORB_RADIUS;
          this._radius = Math.sqrt(sum / Math.PI);
        }
      }
    }

    this._x = Math.max(
      this._radius,
      Math.min(MAP_WIDTH - this._radius, this._x),
    );
    this._y = Math.max(
      this._radius,
      Math.min(MAP_HEIGHT - this._radius, this._y),
    );
    return eatenOrbs;
  }

  draw(ctx: CanvasRenderingContext2D, camera: Camera) {
    ctx.beginPath();
    ctx.arc(
      this._x - camera.x,
      this._y - camera.y,
      this._radius,
      0,
      Math.PI * 2,
    );

    ctx.fillStyle = this._color;
    ctx.fill();

    ctx.strokeStyle = darkenHex(this._color);
    ctx.lineWidth = 7 + this._radius * 0.05;
    ctx.stroke();
  }
}
