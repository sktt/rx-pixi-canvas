import PIXI from 'pixi.js'
import {obs} from './observables'
import {Observable} from 'rx'

type RendererConfig = {
  size: {
    x: number,
    y: number
  }
}

export default class Renderer {
  constructor(config: RendererConfig) {
    this.config = config
    this.renderer = (_ => {
      const r = new PIXI.WebGLRenderer(config.size.x, config.size.y, {
        antialias: true
      })
      r.plugins.interaction.destroy()
      delete r.plugins.interaction
      return r
    })()

  }

  mount(root) {
    root.appendChild(this.renderer.view)
  }

  resize(x, y) {
    this.renderer.view.style.height = this.config.size.y * (x / this.config.size.x) + 'px'
  }


  start() {
    obs.domRoot.connect()
    obs.resize.connect()
    obs.tick.connect()
  }

}
