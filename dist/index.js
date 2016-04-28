(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('rx'), require('pixi.js')) :
  typeof define === 'function' && define.amd ? define(['rx', 'pixi.js'], factory) :
  (global.canvasRenderer = factory(global.Rx,global.PIXI));
}(this, function (rx,PIXI) { 'use strict';

  PIXI = 'default' in PIXI ? PIXI['default'] : PIXI;

  /**
   * asset loader should implement
   */

  var Loader = function () {
    function Loader(input) {
      return input != null && typeof input.add === 'function' && typeof input.load === 'function';
    }

    ;
    Object.defineProperty(Loader, Symbol.hasInstance, {
      value: function (input) {
        return Loader(input);
      }
    });
    return Loader;
  }();

  // -----------------------------------------------------------------------------

  /**
   * create observer helpers
   */


  var create = {};

  /**
   * Static observers cold or hot
   */
  var obs = {};

  /**
   * Add assets to loader and return a stream that emits when a Loader is
   * completed. Emits also for when no assets are sent
   */
  create.resources = function (loader, assets) {
    if (!Loader(loader)) {
      throw new TypeError('Value of argument "loader" violates contract.\n\nExpected:\nLoader\n\nGot:\n' + _inspect(loader));
    }

    if (!Object.keys(assets).length) {
      // no assets, emit empty
      return rx.Observable.just({});
    }
    Object.keys(assets).reduce(
    // Loader#add is chainable ^_^_^
    function (loader, key) {
      return loader.add(key, assets[key]);
    }, loader);
    return rx.Observable.fromCallback(loader.load, loader, function (_, resources) {
      return resources;
    })();
  };

  /**
   * Emits when dom is ready
   */
  obs.domReady = rx.Observable.merge(rx.Observable.just(), rx.Observable.fromEvent(document, 'readystatechange')).map(function (_) {
    return document.readyState;
  }).filter(function (s) {
    return s === 'complete';
  }).take(1);

  /**
   * Emits window size
   */
  obs.resize = rx.Observable.merge(rx.Observable.just(), rx.Observable.fromEvent(window, 'resize')).map(function (_) {
    return [window.innerWidth, window.innerHeight];
  }).publishValue([window.innerWidth, window.innerHeight]);

  /**
   * Emits root dom node when it's ready
   */
  obs.domRoot = obs.domReady.flatMap(function (_) {
    return rx.Observable.just(document.body).map(function (body) {
      body.style.backgroundColor = '#000';
      body.style.display = 'flex';
      body.style.justifyContent = 'center';
      body.style.height = '100%';
      body.style.margin = '0';
      body.style.flexDirection = 'column';
      body.parentNode.style.height = '100%';
      return body;
    });
  })
  // there is only one root
  .take(1)
  // and it should be shared ref
  .publish();

  var delta = function (last) {
    return function (curr) {
      var dt = Math.max(0, curr - last);
      last = curr;
      return dt;
    };
  };

  /**
   * Emits on every frame with delta time
   */
  obs.tick = rx.Observable.create(function (observer) {
    var requestId = void 0;
    var callback = function (currentTime) {
      // If we have not been disposed, then request the next frame
      if (requestId) {
        requestId = window.requestAnimationFrame(callback);
      }
      observer.onNext(currentTime);
    };

    requestId = window.requestAnimationFrame(callback);

    return function () {
      if (requestId) {
        var r = requestId;
        requestId = undefined;
        window.cancelAnimationFrame(r);
      }
    };
  }).map(delta(performance.now())).publish();

  var common = { create: create, obs: obs };

  function _inspect(input, depth) {
    var maxDepth = 4;
    var maxKeys = 15;

    if (depth === undefined) {
      depth = 0;
    }

    depth += 1;

    if (input === null) {
      return 'null';
    } else if (input === undefined) {
      return 'void';
    } else if (typeof input === 'string' || typeof input === 'number' || typeof input === 'boolean') {
      return typeof input;
    } else if (Array.isArray(input)) {
      if (input.length > 0) {
        var _ret = function () {
          if (depth > maxDepth) return {
              v: '[...]'
            };

          var first = _inspect(input[0], depth);

          if (input.every(function (item) {
            return _inspect(item, depth) === first;
          })) {
            return {
              v: first.trim() + '[]'
            };
          } else {
            return {
              v: '[' + input.slice(0, maxKeys).map(function (item) {
                return _inspect(item, depth);
              }).join(', ') + (input.length >= maxKeys ? ', ...' : '') + ']'
            };
          }
        }();

        if (typeof _ret === "object") return _ret.v;
      } else {
        return 'Array';
      }
    } else {
      var keys = Object.keys(input);

      if (!keys.length) {
        if (input.constructor && input.constructor.name && input.constructor.name !== 'Object') {
          return input.constructor.name;
        } else {
          return 'Object';
        }
      }

      if (depth > maxDepth) return '{...}';
      var indent = '  '.repeat(depth - 1);
      var entries = keys.slice(0, maxKeys).map(function (key) {
        return (/^([A-Z_$][A-Z0-9_$]*)$/i.test(key) ? key : JSON.stringify(key)) + ': ' + _inspect(input[key], depth) + ';';
      }).join('\n  ' + indent);

      if (keys.length >= maxKeys) {
        entries += '\n  ' + indent + '...';
      }

      if (input.constructor && input.constructor.name && input.constructor.name !== 'Object') {
        return input.constructor.name + ' {\n  ' + indent + entries + '\n' + indent + '}';
      } else {
        return '{\n  ' + indent + entries + '\n' + indent + '}';
      }
    }
  }

  var RendererConfig = function () {
    function RendererConfig(input) {
      return input != null && input.size != null && typeof input.size.x === 'number' && typeof input.size.y === 'number';
    }

    ;
    Object.defineProperty(RendererConfig, Symbol.hasInstance, {
      value: function (input) {
        return RendererConfig(input);
      }
    });
    return RendererConfig;
  }();

  var renderer = (function (config) {
    if (!RendererConfig(config)) {
      throw new TypeError('Value of argument "config" violates contract.\n\nExpected:\nRendererConfig\n\nGot:\n' + _inspect$1(config));
    }

    var renderer = function (_) {
      var r = new PIXI.WebGLRenderer(config.size.x, config.size.y, {
        antialias: true
      });
      r.plugins.interaction.destroy();
      delete r.plugins.interaction;
      return r;
    }();

    // Automatically mount. Maybe I don't want to do this at this point
    // though...
    common.obs.domRoot.subscribe(function (body) {
      body.appendChild(renderer.view);
    });

    // Automatically set the height on resize
    common.obs.resize.subscribe(function (_ref) {
      var x = _ref[0];
      var y = _ref[1];

      renderer.view.style.height = config.size.y * (x / config.size.x) + 'px';
    });

    console.info('connect: obs.domRoot');
    common.obs.domRoot.connect();
    console.info('connect: obs.resize');
    common.obs.resize.connect();
    console.info('connect: obs.tick');
    common.obs.tick.connect();
    return renderer;
  })

  function _inspect$1(input, depth) {
    var maxDepth = 4;
    var maxKeys = 15;

    if (depth === undefined) {
      depth = 0;
    }

    depth += 1;

    if (input === null) {
      return 'null';
    } else if (input === undefined) {
      return 'void';
    } else if (typeof input === 'string' || typeof input === 'number' || typeof input === 'boolean') {
      return typeof input;
    } else if (Array.isArray(input)) {
      if (input.length > 0) {
        var _ret = function () {
          if (depth > maxDepth) return {
              v: '[...]'
            };

          var first = _inspect$1(input[0], depth);

          if (input.every(function (item) {
            return _inspect$1(item, depth) === first;
          })) {
            return {
              v: first.trim() + '[]'
            };
          } else {
            return {
              v: '[' + input.slice(0, maxKeys).map(function (item) {
                return _inspect$1(item, depth);
              }).join(', ') + (input.length >= maxKeys ? ', ...' : '') + ']'
            };
          }
        }();

        if (typeof _ret === "object") return _ret.v;
      } else {
        return 'Array';
      }
    } else {
      var keys = Object.keys(input);

      if (!keys.length) {
        if (input.constructor && input.constructor.name && input.constructor.name !== 'Object') {
          return input.constructor.name;
        } else {
          return 'Object';
        }
      }

      if (depth > maxDepth) return '{...}';
      var indent = '  '.repeat(depth - 1);
      var entries = keys.slice(0, maxKeys).map(function (key) {
        return (/^([A-Z_$][A-Z0-9_$]*)$/i.test(key) ? key : JSON.stringify(key)) + ': ' + _inspect$1(input[key], depth) + ';';
      }).join('\n  ' + indent);

      if (keys.length >= maxKeys) {
        entries += '\n  ' + indent + '...';
      }

      if (input.constructor && input.constructor.name && input.constructor.name !== 'Object') {
        return input.constructor.name + ' {\n  ' + indent + entries + '\n' + indent + '}';
      } else {
        return '{\n  ' + indent + entries + '\n' + indent + '}';
      }
    }
  }

  var index = {
    common: common,
    renderer: renderer
  };

  return index;

}));