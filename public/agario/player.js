import { MAP_HEIGHT, MAP_WIDTH, MAX_SPEED, MIN_SPEED, ORB_RADIUS, RADIUS, } from "./config.js";
import { darkenHex } from "./utils.js";
export class Player {
    _id;
    _name;
    _x;
    _y;
    _radius;
    color;
    constructor(id, name, x, y, color) {
        this._id = id;
        this._name = name;
        this._x = x;
        this._y = y;
        this._radius = RADIUS;
        this.color = color;
    }
    get x() {
        return this._x;
    }
    get y() {
        return this._y;
    }
    get radius() {
        return this._radius;
    }
    get name() {
        return this._name;
    }
    get id() {
        return this._id;
    }
    update(dt, mouse, orbs) {
        const dx = mouse.x - this._x;
        const dy = mouse.y - this._y;
        const distance = Math.hypot(dx, dy);
        if (distance > 1) {
            const dirX = dx / distance;
            const dirY = dy / distance;
            //TODO: improve
            const baseSpeed = Math.min(MAX_SPEED, Math.max(MIN_SPEED, distance * 2));
            const sizeFactor = this.radius / RADIUS;
            const speed = baseSpeed / sizeFactor;
            // const baseSpeed = Math.min(MAX_SPEED, Math.max(MIN_SPEED, distance * 2));
            // const speed = baseSpeed / Math.log(this.radius );
            this._x += dirX * speed * dt;
            this._y += dirY * speed * dt;
        }
        for (let i = orbs.length - 1; i >= 0; i--) {
            const orb = orbs[i];
            const odx = orb.x - this._x;
            const ody = orb.y - this._y;
            const odistance = Math.hypot(odx, ody);
            if (odistance < this._radius + orb.radius) {
                orbs.splice(i, 1);
                // TODO: Update the max
                if (this._radius < 200) {
                    let sum = Math.PI * this._radius * this._radius +
                        Math.PI * ORB_RADIUS * ORB_RADIUS;
                    this._radius = Math.sqrt(sum / Math.PI);
                }
            }
        }
        this._x = Math.max(this._radius, Math.min(MAP_WIDTH - this._radius, this._x));
        this._y = Math.max(this._radius, Math.min(MAP_HEIGHT - this._radius, this._y));
    }
    draw(ctx, camera) {
        ctx.beginPath();
        ctx.arc(this._x - camera.x, this._y - camera.y, this._radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = darkenHex(this.color);
        ctx.lineWidth = 7 + this._radius * 0.05;
        ctx.stroke();
    }
}
