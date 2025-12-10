import {
  Camera,
  Mouse,
  Orb,
  PlayerData,
  BlobData,
} from "@/../shared/agario/types";
import { darkenHex, isInView, radiusFromMass } from "@/../shared/agario/utils";
import {
  MAP_WIDTH,
  MAP_HEIGHT,
  MAX_SPEED,
  MIN_SPEED,
  INIT_MASS,
  MAXIMUM_MASS_LIMIT,
} from "@/../shared/agario/config";

const MAX_BLOBS_PER_PLAYER = 16;
const MIN_SPLIT_MASS = INIT_MASS * 4;
const MERGE_BASE_TIME = 30;
const MERGE_FACTOR = 0.0233;
const SPLIT_LAUNCH_SPEED = 700;
const SPLIT_FRICTION = 3;

function computeMergeCooldown(mass: number): number {
  return MERGE_BASE_TIME + mass * MERGE_FACTOR;
}

export class Player {
  private _id: string;
  private _name: string;
  private _color: string;
  private _blobs: BlobData[];
  private _splitOrderCounter: number;

  constructor(id: string, name: string, color: string, blobs?: BlobData[]) {
    this._id = id;
    this._name = name;
    this._color = color;
    this._splitOrderCounter = 0;

    if (blobs && blobs.length > 0) {
      this._blobs = blobs.map((b) => this.fromBlobData(b));
      const maxOrder = this._blobs.reduce(
        (max, b) => (b.splitOrder > max ? b.splitOrder : max),
        0,
      );
      this._splitOrderCounter = maxOrder;
    } else {
      this._blobs = [
        {
          id: `${id}-0`,
          //TODO: random
          x: MAP_WIDTH / 2,
          y: MAP_HEIGHT / 2,
          mass: INIT_MASS,
          vx: 0,
          vy: 0,
          mergeCooldown: 0,
          splitOrder: 0,
        },
      ];
    }
  }

  private fromBlobData(b: BlobData): BlobData {
    return {
      id: b.id,
      x: b.x,
      y: b.y,
      mass: b.mass,
      vx: b.vx,
      vy: b.vy,
      mergeCooldown: b.mergeCooldown,
      splitOrder: b.splitOrder,
    };
  }

  get y(): number {
    if (this._blobs.length === 0) return 0;
    let massSum = 0;
    let ySum = 0;
    for (const b of this._blobs) {
      massSum += b.mass;
      ySum += b.y * b.mass;
    }
    return ySum / massSum;
  }

  get x(): number {
    if (this._blobs.length === 0) return 0;
    let massSum = 0;
    let xSum = 0;
    for (const b of this._blobs) {
      massSum += b.mass;
      xSum += b.x * b.mass;
    }
    return xSum / massSum;
  }

  get blobs(): BlobData[] {
    return this._blobs;
  }

  set blobs(blobs: BlobData[]) {
    this._blobs = blobs;
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

  updateFromData(data: PlayerData) {
    this._name = data.name;
    this._color = data.color;
    this._blobs = data.blobs.map((b) => this.fromBlobData(b));

    const maxOrder = this._blobs.reduce(
      (max, b) => (b.splitOrder > max ? b.splitOrder : max),
      0,
    );
    this._splitOrderCounter = maxOrder;
  }

  serialize(): PlayerData {
    return {
      id: this._id,
      name: this._name,
      color: this._color,
      blobs: this._blobs.map((b) => ({
        id: b.id,
        x: b.x,
        y: b.y,
        mass: b.mass,
        vx: b.vx,
        vy: b.vy,
        mergeCooldown: b.mergeCooldown,
        splitOrder: b.splitOrder,
      })),
    };
  }

  static deserialize(data: PlayerData): Player {
    return new Player(data.id, data.name, data.color, data.blobs);
  }

  private clampBlobToMap(blob: BlobData) {
    const r = radiusFromMass(blob.mass);
    blob.x = Math.max(r, Math.min(MAP_WIDTH - r, blob.x));
    blob.y = Math.max(r, Math.min(MAP_HEIGHT - r, blob.y));
  }

  update(
    dt: number,
    mouse: Mouse,
    orbs: Orb[],
    isDead: boolean = false,
  ): string[] {
    const blobs = this._blobs;

    const frictionDecay = Math.exp(-SPLIT_FRICTION * dt);

    for (const blob of blobs) {
      if (blob.mergeCooldown > 0) {
        blob.mergeCooldown = Math.max(0, blob.mergeCooldown - dt);
      }

      if (blob.vx !== 0 || blob.vy !== 0) {
        blob.x += blob.vx * dt;
        blob.y += blob.vy * dt;

        blob.vx *= frictionDecay;
        blob.vy *= frictionDecay;

        if (Math.abs(blob.vx) < 1) blob.vx = 0;
        if (Math.abs(blob.vy) < 1) blob.vy = 0;
      }
    }

    for (const blob of blobs) {
      const dx = mouse.x - blob.x;
      const dy = mouse.y - blob.y;
      const distance = Math.hypot(dx, dy);

      if (distance > 1) {
        const dirX = dx / distance;
        const dirY = dy / distance;

        const baseSpeed = Math.min(
          MAX_SPEED,
          Math.max(MIN_SPEED, distance * 2),
        );
        const sizeFactor = Math.sqrt(blob.mass / INIT_MASS);
        const speed = baseSpeed / sizeFactor;

        blob.x += dirX * speed * dt;
        blob.y += dirY * speed * dt;
      }

      this.clampBlobToMap(blob);
    }

    for (let i = 0; i < blobs.length; i++) {
      let a = blobs[i];

      for (let j = i + 1; j < blobs.length; ) {
        const b = blobs[j];

        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let dist = Math.hypot(dx, dy);
        const ra = radiusFromMass(a.mass);
        const rb = radiusFromMass(b.mass);
        const minDist = ra + rb;

        if (dist === 0) {
          dx = Math.random() - 0.5;
          dy = Math.random() - 0.5;
          dist = Math.hypot(dx, dy) || 1;
        }

        if (dist < minDist) {
          const overlap = minDist - dist;
          const nx = dx / dist;
          const ny = dy / dist;

          const canMerge = a.mergeCooldown <= 0 && b.mergeCooldown <= 0;

          if (canMerge) {
            const totalMass = a.mass + b.mass;

            const newX = (a.x * a.mass + b.x * b.mass) / totalMass;
            const newY = (a.y * a.mass + b.y * b.mass) / totalMass;
            const newVx = (a.vx * a.mass + b.vx * b.mass) / totalMass;
            const newVy = (a.vy * a.mass + b.vy * b.mass) / totalMass;

            a.x = newX;
            a.y = newY;
            a.vx = newVx;
            a.vy = newVy;
            a.mass = totalMass;
            a.mergeCooldown = 0;

            this.clampBlobToMap(a);

            blobs.splice(j, 1);
            continue;
          } else {
            const totalMass = a.mass + b.mass;
            const aWeight = b.mass / totalMass;
            const bWeight = a.mass / totalMass;

            a.x -= nx * overlap * aWeight;
            a.y -= ny * overlap * aWeight;
            b.x += nx * overlap * bWeight;
            b.y += ny * overlap * bWeight;

            this.clampBlobToMap(a);
            this.clampBlobToMap(b);
          }
        }

        j++;
      }
    }

    if (isDead) return [];

    const eatenOrbs: string[] = [];

    for (const orb of orbs) {
      const orbRadius = radiusFromMass(orb.mass);
      for (const blob of blobs) {
        const odx = orb.x - blob.x;
        const ody = orb.y - blob.y;
        const odistance = Math.hypot(odx, ody);

        const br = radiusFromMass(blob.mass);

        if (odistance < br + orbRadius) {
          eatenOrbs.push(orb.id);

          blob.mass += orb.mass;

          if (blob.mass > MAXIMUM_MASS_LIMIT) blob.mass = MAXIMUM_MASS_LIMIT;
          // const r = radiusFromMass(blob.mass);
          // if (r > 200) {
          // const cappedMass = Math.PI * 200 * 200;
          // blob.mass = cappedMass;
          // }

          break;
        }
      }
    }

    // Mass decay (0.2% per second)
    const decayFactor = Math.pow(0.998, dt);
    for (const blob of this._blobs) {
      blob.mass *= decayFactor;
      if (blob.mass < INIT_MASS) blob.mass = INIT_MASS;
    }

    return eatenOrbs;
  }

  draw(ctx: CanvasRenderingContext2D, camera: Camera) {
    for (const blob of this._blobs) {
      const r = radiusFromMass(blob.mass);
      if (!isInView(blob.x, blob.y, r, camera)) continue;

      const screenX = blob.x - camera.x;
      const screenY = blob.y - camera.y;

      ctx.beginPath();
      ctx.arc(screenX, screenY, r, 0, Math.PI * 2);

      ctx.fillStyle = this._color;
      ctx.fill();

      ctx.strokeStyle = darkenHex(this._color);
      ctx.lineWidth = 7 + r * 0.05;
      ctx.stroke();

      ctx.fillStyle = "black";
      ctx.font = `bold ${r * 0.5}px Market, "Helvetica Neue", Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(this._name, screenX, screenY);
    }
  }

  split(mouse: Mouse) {
    if (this._blobs.length >= MAX_BLOBS_PER_PLAYER) return;
    if (this._blobs.length === 0) return;

    const splittable = this._blobs.filter((b) => b.mass >= MIN_SPLIT_MASS);

    if (splittable.length === 0) return;
    splittable.sort((a, b) => a.splitOrder - b.splitOrder);

    const availableSlots = MAX_BLOBS_PER_PLAYER - this._blobs.length;
    const maxToSplit = Math.min(8, availableSlots);
    if (maxToSplit <= 0) return;

    const toSplit = splittable.slice(0, maxToSplit);
    const newBlobs: BlobData[] = [];

    for (const blob of toSplit) {
      if (this._blobs.length + newBlobs.length >= MAX_BLOBS_PER_PLAYER) break;

      if (blob.mass < MIN_SPLIT_MASS) continue;

      let dx = mouse.x - blob.x;
      let dy = mouse.y - blob.y;
      let dist = Math.hypot(dx, dy);
      if (dist < 1e-3) {
        dx = Math.random() - 0.5;
        dy = Math.random() - 0.5;
        dist = Math.hypot(dx, dy) || 1;
      }
      const dirX = dx / dist;
      const dirY = dy / dist;

      const newMass = blob.mass / 2;

      blob.mass = newMass;
      blob.mergeCooldown = computeMergeCooldown(newMass);
      blob.splitOrder = blob.splitOrder || ++this._splitOrderCounter;

      const r = radiusFromMass(newMass);
      const offset = r * 2.2;

      const child: BlobData = {
        id: `${this._id}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        x: Math.max(r, Math.min(MAP_WIDTH - r, blob.x + dirX * offset)),
        y: Math.max(r, Math.min(MAP_HEIGHT - r, blob.y + dirY * offset)),
        mass: newMass,
        vx: dirX * SPLIT_LAUNCH_SPEED,
        vy: dirY * SPLIT_LAUNCH_SPEED,
        mergeCooldown: computeMergeCooldown(newMass),
        splitOrder: ++this._splitOrderCounter,
      };

      blob.vx -= dirX * SPLIT_LAUNCH_SPEED * 0.25;
      blob.vy -= dirY * SPLIT_LAUNCH_SPEED * 0.25;

      newBlobs.push(child);
    }

    if (newBlobs.length > 0) {
      this._blobs.push(...newBlobs);
    }
  }
}
