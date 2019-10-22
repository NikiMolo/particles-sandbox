import Particle from "./particle";
import Link from "./link";
import {
  BACKGROUND_COLOR,
  MAX_PARTICLE_VELOCITY,
  PARTICLE_RADIUS,
  MAX_LINK_DISTANCE,
  PARITY_MOD,
  ACCELERATION
} from "./constants";

const DIMENSIONS = ['x', 'y'];

export default class MotionProcess {
  constructor(ctx, particles_num) {
    this.ctx = ctx;
    this.particles_num = particles_num;
    this.paused = true;
    this.timers = {
      links_search: 0
    };
    this.field_size = {x: ctx.canvas.width, y: ctx.canvas.height};
    this.particles_pool = [];
    this.links_pool = [];
    this.square_size = {x: 0, y: 0};
    this.links_registry = {};
    this.current_frame = null;
    this.tick = this.processTick.bind(this);
  }

  start() {
    this.ctx.translate(0.5, 0.5);
    this.initParticles();
    this.paused = false;
    requestAnimationFrame(this.tick);
  }

  processTick() {
    this.drawTick();

    if (!this.paused) {
      this.current_frame = requestAnimationFrame(this.tick);
    }
  }

  drawTick() {
    this.drawField();
    this.shiftParticles();
    this.drawLinks();
    this.handleAcceleration();
  }

  initParticles() {
    const x_squares = Math.floor(this.field_size.x / MAX_LINK_DISTANCE);
    const y_squares = Math.floor(this.field_size.y / MAX_LINK_DISTANCE);

    this.square_size.x = this.field_size.x / x_squares;
    this.square_size.y = this.field_size.y / y_squares;

    for (let x = 0; x < x_squares; x++) {
      const column = [];

      for (let y = 0; y < y_squares; y++) {
        column.push([]);
      }

      this.particles_pool.push(column);
    }

    for (let i = 0; i < this.particles_num; i++) {
      const x = Math.round(Math.random() * (this.field_size.x));
      const y = Math.round(Math.random() * (this.field_size.y));
      const vel = {
        x: +((Math.random() - 0.5) * MAX_PARTICLE_VELOCITY).toFixed(2),
        y: +((Math.random() - 0.5) * MAX_PARTICLE_VELOCITY).toFixed(2),
      };
      const next_particle = new Particle(x, y, vel, i % PARITY_MOD);
      const pool_x_idx = (Math.ceil(x / this.square_size.x) || 1) - 1;
      const pool_y_idx = (Math.ceil(y / this.square_size.y) || 1) - 1;

      this.particles_pool[pool_x_idx][pool_y_idx].push(next_particle);
    }
  }

  drawField() {
    this.ctx.fillStyle = BACKGROUND_COLOR;
    this.ctx.fillRect(0, 0, this.field_size.x, this.field_size.y);
  }

  shiftParticles() {
    this.particles_pool.forEach((x_pool, x_idx) => {
      x_pool.forEach((y_pool, y_idx) => {
        y_pool.forEach(particle => {
          const next_position = {};

          DIMENSIONS.forEach(dim => {
            let next = particle[dim] + particle.vel[dim];
            const end_border = this.field_size[dim] - PARTICLE_RADIUS;

            if (next > end_border && particle.vel[dim] > 0) {
              next = 2 * end_border - particle.vel[dim] - particle[dim] - PARTICLE_RADIUS;
              particle.invertVelocity(dim);
            } else if (next < PARTICLE_RADIUS && particle.vel[dim] < 0) {
              next = Math.abs(particle.vel[dim]) - particle[dim] + PARTICLE_RADIUS;
              particle.invertVelocity(dim);
            }

            next_position[dim] = next;
          });

          particle.setPosition(next_position);
          particle.drawSelf(this.ctx);
        });
      });
    });
    this.particles_pool.forEach((col, x_idx) => {
      col.forEach((pool, y_idx) => {
        pool.forEach(particle => {
          const last_position = {x: x_idx, y: y_idx};
          const shift = this.getPoolShift(last_position, particle);

          if (shift.x || shift.y) {
            this.migrateParticle(particle, last_position, shift);
          }
        });
      });
    });
  }

  getPoolShift(cur, next) {
    const shift = {x: 0, y: 0};

    DIMENSIONS.forEach(dim => {
      if (next[dim] / this.square_size[dim] > cur[dim] + 1) {
        shift[dim]++;
      } else if (next[dim] / this.square_size[dim] < cur[dim]) {
        shift[dim]--;
      }
    });

    return shift;
  }

  migrateParticle(particle, cur_pos, shift) {
    const cur_pool = this.particles_pool[cur_pos.x][cur_pos.y];
    const next_pool = this.particles_pool[cur_pos.x + shift.x][cur_pos.y + shift.y];
    const cur_idx = cur_pool.indexOf(particle);

    cur_pool.splice(cur_idx, 1);
    next_pool.push(particle);
  }

  drawLinks() {
    this.createLinks();
    this.links_pool.forEach(link => {
      const dist = this.getDistance(link.from, link.to);
      if (dist > MAX_LINK_DISTANCE) {
        this.removeLink(link);
      }
      link.setOpacity(dist);
      link.drawSelf(this.ctx);
    });
  }

  createLinks() {
    const checked = {};
    const checkPair = (particle_1, particle_2) => {
      const dist = this.getDistance(particle_1, particle_2);
      const isRegistered = (id_1, id_2) => this.links_registry[id_1] && this.links_registry[id_1][id_2];

      if (dist <= MAX_LINK_DISTANCE && !isRegistered(particle_1.uuid, particle_2.uuid)) {
        const link = new Link(particle_1, particle_2);
        this.addLinkRegistryEntry(particle_1.uuid, particle_2.uuid, link.uuid);
        this.links_pool.push(link);
      }
    };
    const checkSelfParticles = square => {
      for (let i = 0; i < square.length - 1; i++) {
        for (let j = i + 1; j < square.length; j++) {
          checkPair(square[i], square[j]);
        }
      }
    };
    const checkTwoSquaresParticles = (square, neighbour) => {
      for (let i = 0; i < square.length; i++) {
        for (let j = 0; j < neighbour.length; j++) {
          checkPair(square[i], neighbour[j]);
        }
      }
    };
    const checkNeighbourSquares = (square, x_cur, y_cur) => {
      for (let x = x_cur - 1; x <= x_cur + 1; x++) {
        for (let y = y_cur - 1; y <= y_cur + 1; y++) {
          const neighbour = this.particles_pool[x] && this.particles_pool[x][y];

          if (neighbour && checked[x] && checked[x][y] && (x !== x_cur || y !== y_cur)) {
            checkTwoSquaresParticles(square, neighbour);
          }
        }
      }
    };

    this.particles_pool.forEach((column, x_idx) => {
      this.particles_pool[x_idx].forEach((square, y_idx) => {
        checkSelfParticles(square);
        checkNeighbourSquares(square, x_idx, y_idx);
        checked[x_idx] = checked[x_idx] ? checked[x_idx] : {};
        checked[x_idx][y_idx] = true;
      });
    });
  }

  addLinkRegistryEntry(id_1, id_2, link_id) {
    this.links_registry[id_1] = this.links_registry[id_1] ? {
      ...this.links_registry[id_1],
      [id_2]: link_id
    } : {[id_2]: link_id};
    this.links_registry[id_2] = this.links_registry[id_2] ? {
      ...this.links_registry[id_2],
      [id_1]: link_id
    } : {[id_1]: link_id};
  }

  removeLink(link) {
    delete this.links_registry[link.from.uuid][link.to.uuid];
    delete this.links_registry[link.to.uuid][link.from.uuid];

    const idx = this.links_pool.findIndex(item => item.uuid === link.uuid);
    this.links_pool.splice(idx, 1);
  }

  getDistance(from, to) {
    return Math.sqrt((from.x - to.x) ** 2 + (from.y - to.y) ** 2);
  }

  handleAcceleration() {
    const center = [
      {
        x: this.field_size.x / 4,
        y: this.field_size.y / 4
      },
      {
        x: this.field_size.x / 4,
        y: 3 * this.field_size.y / 2
      },
      {
        x: 3 * this.field_size.x / 2,
        y: this.field_size.y / 4
      },
      {
        x: 3 * this.field_size.x / 2,
        y: 3 * this.field_size.y / 4
      },
      {
        x:  this.field_size.x / 2,
        y:  this.field_size.y / 2
      },
    ];

    this.particles_pool.forEach(col => {
      col.forEach(pool => {
        pool.forEach(particle => {
          const len = this.getDistance(particle, center[particle.parity]);
          const acc = {
            x: -ACCELERATION * (particle.x - center[particle.parity].x) / len,
            y: -ACCELERATION * (particle.y - center[particle.parity].y) / len
          };

          particle.setAcceleration(acc);
        });
      });
    });
  }
}