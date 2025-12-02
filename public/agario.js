"use strict";
const MAP_WIDTH = 2000;
const MAP_HEIGHT = 2000;
const RADIUS = 20;
const MAX_SPEED = 400;
const MIN_SPEED = 50;
class Player {
    _x;
    _y;
    _radius;
    color;
    constructor(x, y, color) {
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
                if (this._radius < 200)
                    this._radius += 0.3;
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
function darkenHex(hex, amount = 0.3) {
    hex = hex.replace("#", "");
    const num = parseInt(hex, 16);
    let r = (num >> 16) & 255;
    let g = (num >> 8) & 255;
    let b = num & 255;
    r = Math.floor(r * (1 - amount));
    g = Math.floor(g * (1 - amount));
    b = Math.floor(b * (1 - amount));
    return ("#" +
        r.toString(16).padStart(2, "0") +
        g.toString(16).padStart(2, "0") +
        b.toString(16).padStart(2, "0"));
}
function randomOrb() {
    return {
        x: Math.random() * MAP_WIDTH,
        y: Math.random() * MAP_HEIGHT,
        radius: 8,
        color: randomColor(),
    };
}
function randomColor() {
    const r = Math.floor(Math.random() * 255);
    const g = Math.floor(Math.random() * 255);
    const b = Math.floor(Math.random() * 255);
    return `rgb(${r}, ${g}, ${b})`;
}
function drawGrid(ctx, camera) {
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
function drawOrbs(ctx, orbs, camera) {
    for (const orb of orbs) {
        const sx = orb.x - camera.x;
        const sy = orb.y - camera.y;
        if (sx + orb.radius < 0 ||
            sx - orb.radius > camera.width ||
            sy + orb.radius < 0 ||
            sy - orb.radius > camera.height) {
            continue;
        }
        ctx.beginPath();
        ctx.fillStyle = orb.color;
        ctx.arc(sx, sy, orb.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}
function initAgario(canvas) {
    const ctx = canvas.getContext("2d");
    if (!ctx) {
        throw new Error("Could not get 2D context");
    }
    let animationId = null;
    let orbs = [];
    let player = null;
    let camera = null;
    let mouse = { x: 0, y: 0 };
    let lastTime = null;
    function resizeCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const width = window.innerWidth;
        const height = window.innerHeight;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        const ctx = canvas.getContext("2d");
        if (ctx)
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function handleResize() {
        resizeCanvas();
        if (camera && player) {
            camera.width = canvas.width;
            camera.height = canvas.height;
            camera.x = player.x - camera.width / 2;
            camera.y = player.y - camera.height / 2;
        }
    }
    function handleMouseMove(e) {
        const rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
    }
    resizeCanvas();
    player = new Player(MAP_WIDTH / 2, MAP_HEIGHT / 2, "#ef4444");
    camera = {
        x: player.x - canvas.width / 2,
        y: player.y - canvas.height / 2,
        width: canvas.width,
        height: canvas.height,
    };
    mouse = {
        x: canvas.width / 2,
        y: canvas.height / 2,
    };
    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove);
    function update(dt) {
        if (!player || !camera)
            return;
        while (orbs.length < 200) {
            orbs.push(randomOrb());
        }
        const worldMouse = {
            x: mouse.x + camera.x,
            y: mouse.y + camera.y,
        };
        player.update(dt, worldMouse, orbs);
        camera.x = player.x - camera.width / 2;
        camera.y = player.y - camera.height / 2;
    }
    function draw() {
        if (!camera || !player || !ctx)
            return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // ctx.fillStyle = "#ffffff";
        // ctx.fillRect(0, 0, canvas.width, canvas.height);
        drawGrid(ctx, camera);
        ctx.strokeStyle = "#000";
        ctx.strokeRect(-camera.x, -camera.y, MAP_WIDTH, MAP_HEIGHT);
        drawOrbs(ctx, orbs, camera);
        player.draw(ctx, camera);
    }
    function gameLoop(now) {
        if (lastTime == null) {
            lastTime = now;
        }
        const dt = (now - lastTime) / 1000;
        lastTime = now;
        update(dt);
        draw();
        animationId = requestAnimationFrame(gameLoop);
    }
    animationId = requestAnimationFrame(gameLoop);
    return () => {
        window.removeEventListener("resize", handleResize);
        window.removeEventListener("mousemove", handleMouseMove);
        if (animationId !== null) {
            cancelAnimationFrame(animationId);
        }
    };
}
window.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("agario");
    if (canvas instanceof HTMLCanvasElement) {
        const destroy = initAgario(canvas);
        window.addEventListener("beforeunload", () => {
            destroy();
        });
    }
});
