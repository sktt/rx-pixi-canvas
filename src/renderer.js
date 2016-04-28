import PIXI from 'pixi.js'
import common from './common'
import {Observable} from 'rx'

type RendererConfig = {
  site: {
    x: number,
    y: number
  }
}

export default (config: RendererConfig) => {

  const renderer = (() => {
    const r = new PIXI.WebGLRenderer(config.size.x, config.size.y, {
      antialias: true
    })
    r.plugins.interaction.destroy()
    delete r.plugins.interaction
    return r
  })()

  common.obs.domRoot.subscribe(body => {
    body.appendChild(renderer.view)
  })

  common.obs.resize.subscribe(([x, y]) => {
    renderer.view.style.height = `${config.size.y * (x / config.size.x)}px`
  })

  return renderer
}
