import {PARTICLE_RADIUS} from "./constants";
import UniqueEntity from "./unique-entity";

export default class Particle extends UniqueEntity {
  constructor(x, y, vel, parity) {
    super();
    this.x = x;
    this.y = y;
    this.vel = vel;
    this.parity = parity;
    this.acc = {x: 0, y: 0};
  }

  drawSelf(ctx) {
    ctx.beginPath();
    ctx.fillStyle = '#ff8d8d';
    ctx.arc(this.x, this.y, PARTICLE_RADIUS, 0, 2 * Math.PI);
    ctx.fill();
  }

  setPosition(position) {
    this.x = position.x;
    this.y = position.y;
  }

  setAcceleration(acc) {
    this.vel = {x: this.vel.x + acc.x, y: this.vel.y + acc.y};
  }

  invertVelocity(dimension) {
    this.vel = {
      x: this.vel.x * (dimension === 'x' ? -1 : 1),
      y: this.vel.y * (dimension === 'y' ? -1 : 1)
    };
  }
}