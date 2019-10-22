import UniqueEntity from "./unique-entity";
import {MAX_LINK_DISTANCE} from "./constants";

export default class Link extends UniqueEntity{
  constructor(from, to) {
    super();
    this.from = from;
    this.to = to;
    this.opacity = 'ff';
  }

  drawSelf(ctx) {
    ctx.beginPath();
    ctx.strokeStyle = '#ffffff' + this.opacity;
    ctx.moveTo(this.from.x, this.from.y);
    ctx.lineTo(this.to.x, this.to.y);
    ctx.stroke();
  }

  setOpacity(dist) {
    this.opacity = (MAX_LINK_DISTANCE - dist.toFixed(0)).toString(16);
  }
}