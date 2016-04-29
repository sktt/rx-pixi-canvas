import babel from 'rollup-plugin-babel'
import uglify from 'rollup-plugin-uglify'
import nodeResolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'

const PROD = process.env.NODE_ENV === 'production'
const MINIFY = PROD

export default {
  format: 'umd',
  moduleName: 'canvasRenderer',
  globals: {
    'rx': 'Rx',
    'pixi.js': 'PIXI',
  },
  plugins: [
    babel(),
    nodeResolve({
      jsnext: true,
      main: true,
      skip: ['rx', 'pixi.js']
    }),
    commonjs({
      include: 'node_modules/**',  // Default: undefined
      ignoreGlobal: false,  // Default: false
      sourceMap: false,  // Default: true
    })
  ].concat(
    MINIFY ? [uglify()] : []
  ),
  dest: `dist/index${MINIFY ? '.min' : '' }.js`
}
