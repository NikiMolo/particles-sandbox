import React from 'react';
import MotionProcess from "../common/motion-process";
import {MAX_PARTICLES_COUNT} from "../common/constants";

class Background extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      ctx: null,
      motion_process: null
    };
  }

  componentDidMount() {
    const ctx = document.getElementById('canvas').getContext('2d');
    ctx.canvas.width  = window.innerWidth;
    ctx.canvas.height = window.innerHeight;
    const motion_process = new MotionProcess(ctx, MAX_PARTICLES_COUNT);

    this.setState({ctx, motion_process}, () => {
      this.state.motion_process.start();
    });
  }

  render() {
    return <canvas id="canvas"/>
  }
}

export default Background;