import PIXI from 'pixi.js'
import common from './common'
import {Observable} from 'rx'

type RendererConfig = {
  size: {
    x: number,
    y: number
  }
}

export default (config: RendererConfig) => {

  const renderer = (_ => {
    const r = new PIXI.WebGLRenderer(config.size.x, config.size.y, {
      antialias: true
    })
    r.plugins.interaction.destroy()
    delete r.plugins.interaction
    return r
  })()

  // Automatically mount. Maybe I don't want to do this at this point
  // though...
  common.obs.domRoot.subscribe(body => {
    body.appendChild(renderer.view)
  })

  // Automatically set the height on resize
  common.obs.resize.subscribe(([x, y]) => {
    renderer.view.style.height = config.size.y * (x / config.size.x) + 'px'
  })

  console.info('connect: obs.domRoot')
  common.obs.domRoot.connect()
  console.info('connect: obs.resize')
  common.obs.resize.connect()
  console.info('connect: obs.tick')
  common.obs.tick.connect()
  return renderer
}
