(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('rx'), require('pixi.js')) :
	typeof define === 'function' && define.amd ? define(['rx', 'pixi.js'], factory) :
	(global.canvasRenderer = factory(global.Rx,global.PIXI));
}(this, function (rx,PIXI$1) { 'use strict';

	PIXI$1 = 'default' in PIXI$1 ? PIXI$1['default'] : PIXI$1;

	var babelHelpers = {};

	babelHelpers.classCallCheck = function (instance, Constructor) {
	  if (!(instance instanceof Constructor)) {
	    throw new TypeError("Cannot call a class as a function");
	  }
	};

	babelHelpers;


	function __commonjs(fn, module) { return module = { exports: {} }, fn(module, module.exports), module.exports; }

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


	var obsCreate = {};

	/**
	 * Static observers cold or hot
	 */
	var obs = {};

	/**
	 * Add assets to loader and return a stream that emits when a Loader is
	 * completed. Emits also for when no assets are sent
	 */
	obsCreate.resources = function (loader, assets) {
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

	var Renderer = function () {
	  function Renderer(config) {
	    babelHelpers.classCallCheck(this, Renderer);

	    if (!RendererConfig(config)) {
	      throw new TypeError('Value of argument "config" violates contract.\n\nExpected:\nRendererConfig\n\nGot:\n' + _inspect$1(config));
	    }

	    this.config = config;
	    this.renderer = function (_) {
	      var r = new PIXI$1.WebGLRenderer(config.size.x, config.size.y, {
	        antialias: true
	      });
	      r.plugins.interaction.destroy();
	      delete r.plugins.interaction;
	      return r;
	    }();
	  }

	  Renderer.prototype.mount = function mount(root) {
	    root.appendChild(this.renderer.view);
	  };

	  Renderer.prototype.resize = function resize(x, y) {
	    this.renderer.view.style.height = this.config.size.y * (x / this.config.size.x) + 'px';
	  };

	  Renderer.prototype.start = function start() {
	    obs.domRoot.connect();
	    obs.resize.connect();
	    obs.tick.connect();
	  };

	  return Renderer;
	}();

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

	var searchBounds = __commonjs(function (module) {
	"use strict";

	function compileSearch(funcName, predicate, reversed, extraArgs, useNdarray, earlyOut) {
	  var code = ["function ", funcName, "(a,l,h,", extraArgs.join(","), "){", earlyOut ? "" : "var i=", reversed ? "l-1" : "h+1", ";while(l<=h){\
var m=(l+h)>>>1,x=a", useNdarray ? ".get(m)" : "[m]"];
	  if (earlyOut) {
	    if (predicate.indexOf("c") < 0) {
	      code.push(";if(x===y){return m}else if(x<=y){");
	    } else {
	      code.push(";var p=c(x,y);if(p===0){return m}else if(p<=0){");
	    }
	  } else {
	    code.push(";if(", predicate, "){i=m;");
	  }
	  if (reversed) {
	    code.push("l=m+1}else{h=m-1}");
	  } else {
	    code.push("h=m-1}else{l=m+1}");
	  }
	  code.push("}");
	  if (earlyOut) {
	    code.push("return -1};");
	  } else {
	    code.push("return i};");
	  }
	  return code.join("");
	}

	function compileBoundsSearch(predicate, reversed, suffix, earlyOut) {
	  var result = new Function([compileSearch("A", "x" + predicate + "y", reversed, ["y"], false, earlyOut), compileSearch("B", "x" + predicate + "y", reversed, ["y"], true, earlyOut), compileSearch("P", "c(x,y)" + predicate + "0", reversed, ["y", "c"], false, earlyOut), compileSearch("Q", "c(x,y)" + predicate + "0", reversed, ["y", "c"], true, earlyOut), "function dispatchBsearch", suffix, "(a,y,c,l,h){\
if(a.shape){\
if(typeof(c)==='function'){\
return Q(a,(l===undefined)?0:l|0,(h===undefined)?a.shape[0]-1:h|0,y,c)\
}else{\
return B(a,(c===undefined)?0:c|0,(l===undefined)?a.shape[0]-1:l|0,y)\
}}else{\
if(typeof(c)==='function'){\
return P(a,(l===undefined)?0:l|0,(h===undefined)?a.length-1:h|0,y,c)\
}else{\
return A(a,(c===undefined)?0:c|0,(l===undefined)?a.length-1:l|0,y)\
}}}\
return dispatchBsearch", suffix].join(""));
	  return result();
	}

	module.exports = {
	  ge: compileBoundsSearch(">=", false, "GE"),
	  gt: compileBoundsSearch(">", false, "GT"),
	  lt: compileBoundsSearch("<", true, "LT"),
	  le: compileBoundsSearch("<=", true, "LE"),
	  eq: compileBoundsSearch("-", true, "EQ", true)
	};
	});

	var require$$3 = (searchBounds && typeof searchBounds === 'object' && 'default' in searchBounds ? searchBounds['default'] : searchBounds);

	var intervalTree = __commonjs(function (module) {
	"use strict";

	var bounds = require$$3;

	var NOT_FOUND = 0;
	var SUCCESS = 1;
	var EMPTY = 2;

	module.exports = createWrapper;

	function IntervalTreeNode(mid, left, right, leftPoints, rightPoints) {
	  this.mid = mid;
	  this.left = left;
	  this.right = right;
	  this.leftPoints = leftPoints;
	  this.rightPoints = rightPoints;
	  this.count = (left ? left.count : 0) + (right ? right.count : 0) + leftPoints.length;
	}

	var proto = IntervalTreeNode.prototype;

	function copy(a, b) {
	  a.mid = b.mid;
	  a.left = b.left;
	  a.right = b.right;
	  a.leftPoints = b.leftPoints;
	  a.rightPoints = b.rightPoints;
	  a.count = b.count;
	}

	function rebuild(node, intervals) {
	  var ntree = createIntervalTree(intervals);
	  node.mid = ntree.mid;
	  node.left = ntree.left;
	  node.right = ntree.right;
	  node.leftPoints = ntree.leftPoints;
	  node.rightPoints = ntree.rightPoints;
	  node.count = ntree.count;
	}

	function rebuildWithInterval(node, interval) {
	  var intervals = node.intervals([]);
	  intervals.push(interval);
	  rebuild(node, intervals);
	}

	function rebuildWithoutInterval(node, interval) {
	  var intervals = node.intervals([]);
	  var idx = intervals.indexOf(interval);
	  if (idx < 0) {
	    return NOT_FOUND;
	  }
	  intervals.splice(idx, 1);
	  rebuild(node, intervals);
	  return SUCCESS;
	}

	proto.intervals = function (result) {
	  result.push.apply(result, this.leftPoints);
	  if (this.left) {
	    this.left.intervals(result);
	  }
	  if (this.right) {
	    this.right.intervals(result);
	  }
	  return result;
	};

	proto.insert = function (interval) {
	  var weight = this.count - this.leftPoints.length;
	  this.count += 1;
	  if (interval[1] < this.mid) {
	    if (this.left) {
	      if (4 * (this.left.count + 1) > 3 * (weight + 1)) {
	        rebuildWithInterval(this, interval);
	      } else {
	        this.left.insert(interval);
	      }
	    } else {
	      this.left = createIntervalTree([interval]);
	    }
	  } else if (interval[0] > this.mid) {
	    if (this.right) {
	      if (4 * (this.right.count + 1) > 3 * (weight + 1)) {
	        rebuildWithInterval(this, interval);
	      } else {
	        this.right.insert(interval);
	      }
	    } else {
	      this.right = createIntervalTree([interval]);
	    }
	  } else {
	    var l = bounds.ge(this.leftPoints, interval, compareBegin);
	    var r = bounds.ge(this.rightPoints, interval, compareEnd);
	    this.leftPoints.splice(l, 0, interval);
	    this.rightPoints.splice(r, 0, interval);
	  }
	};

	proto.remove = function (interval) {
	  var weight = this.count - this.leftPoints;
	  if (interval[1] < this.mid) {
	    if (!this.left) {
	      return NOT_FOUND;
	    }
	    var rw = this.right ? this.right.count : 0;
	    if (4 * rw > 3 * (weight - 1)) {
	      return rebuildWithoutInterval(this, interval);
	    }
	    var r = this.left.remove(interval);
	    if (r === EMPTY) {
	      this.left = null;
	      this.count -= 1;
	      return SUCCESS;
	    } else if (r === SUCCESS) {
	      this.count -= 1;
	    }
	    return r;
	  } else if (interval[0] > this.mid) {
	    if (!this.right) {
	      return NOT_FOUND;
	    }
	    var lw = this.left ? this.left.count : 0;
	    if (4 * lw > 3 * (weight - 1)) {
	      return rebuildWithoutInterval(this, interval);
	    }
	    var r = this.right.remove(interval);
	    if (r === EMPTY) {
	      this.right = null;
	      this.count -= 1;
	      return SUCCESS;
	    } else if (r === SUCCESS) {
	      this.count -= 1;
	    }
	    return r;
	  } else {
	    if (this.count === 1) {
	      if (this.leftPoints[0] === interval) {
	        return EMPTY;
	      } else {
	        return NOT_FOUND;
	      }
	    }
	    if (this.leftPoints.length === 1 && this.leftPoints[0] === interval) {
	      if (this.left && this.right) {
	        var p = this;
	        var n = this.left;
	        while (n.right) {
	          p = n;
	          n = n.right;
	        }
	        if (p === this) {
	          n.right = this.right;
	        } else {
	          var l = this.left;
	          var r = this.right;
	          p.count -= n.count;
	          p.right = n.left;
	          n.left = l;
	          n.right = r;
	        }
	        copy(this, n);
	        this.count = (this.left ? this.left.count : 0) + (this.right ? this.right.count : 0) + this.leftPoints.length;
	      } else if (this.left) {
	        copy(this, this.left);
	      } else {
	        copy(this, this.right);
	      }
	      return SUCCESS;
	    }
	    for (var l = bounds.ge(this.leftPoints, interval, compareBegin); l < this.leftPoints.length; ++l) {
	      if (this.leftPoints[l][0] !== interval[0]) {
	        break;
	      }
	      if (this.leftPoints[l] === interval) {
	        this.count -= 1;
	        this.leftPoints.splice(l, 1);
	        for (var r = bounds.ge(this.rightPoints, interval, compareEnd); r < this.rightPoints.length; ++r) {
	          if (this.rightPoints[r][1] !== interval[1]) {
	            break;
	          } else if (this.rightPoints[r] === interval) {
	            this.rightPoints.splice(r, 1);
	            return SUCCESS;
	          }
	        }
	      }
	    }
	    return NOT_FOUND;
	  }
	};

	function reportLeftRange(arr, hi, cb) {
	  for (var i = 0; i < arr.length && arr[i][0] <= hi; ++i) {
	    var r = cb(arr[i]);
	    if (r) {
	      return r;
	    }
	  }
	}

	function reportRightRange(arr, lo, cb) {
	  for (var i = arr.length - 1; i >= 0 && arr[i][1] >= lo; --i) {
	    var r = cb(arr[i]);
	    if (r) {
	      return r;
	    }
	  }
	}

	function reportRange(arr, cb) {
	  for (var i = 0; i < arr.length; ++i) {
	    var r = cb(arr[i]);
	    if (r) {
	      return r;
	    }
	  }
	}

	proto.queryPoint = function (x, cb) {
	  if (x < this.mid) {
	    if (this.left) {
	      var r = this.left.queryPoint(x, cb);
	      if (r) {
	        return r;
	      }
	    }
	    return reportLeftRange(this.leftPoints, x, cb);
	  } else if (x > this.mid) {
	    if (this.right) {
	      var r = this.right.queryPoint(x, cb);
	      if (r) {
	        return r;
	      }
	    }
	    return reportRightRange(this.rightPoints, x, cb);
	  } else {
	    return reportRange(this.leftPoints, cb);
	  }
	};

	proto.queryInterval = function (lo, hi, cb) {
	  if (lo < this.mid && this.left) {
	    var r = this.left.queryInterval(lo, hi, cb);
	    if (r) {
	      return r;
	    }
	  }
	  if (hi > this.mid && this.right) {
	    var r = this.right.queryInterval(lo, hi, cb);
	    if (r) {
	      return r;
	    }
	  }
	  if (hi < this.mid) {
	    return reportLeftRange(this.leftPoints, hi, cb);
	  } else if (lo > this.mid) {
	    return reportRightRange(this.rightPoints, lo, cb);
	  } else {
	    return reportRange(this.leftPoints, cb);
	  }
	};

	function compareNumbers(a, b) {
	  return a - b;
	}

	function compareBegin(a, b) {
	  var d = a[0] - b[0];
	  if (d) {
	    return d;
	  }
	  return a[1] - b[1];
	}

	function compareEnd(a, b) {
	  var d = a[1] - b[1];
	  if (d) {
	    return d;
	  }
	  return a[0] - b[0];
	}

	function createIntervalTree(intervals) {
	  if (intervals.length === 0) {
	    return null;
	  }
	  var pts = [];
	  for (var i = 0; i < intervals.length; ++i) {
	    pts.push(intervals[i][0], intervals[i][1]);
	  }
	  pts.sort(compareNumbers);

	  var mid = pts[pts.length >> 1];

	  var leftIntervals = [];
	  var rightIntervals = [];
	  var centerIntervals = [];
	  for (var i = 0; i < intervals.length; ++i) {
	    var s = intervals[i];
	    if (s[1] < mid) {
	      leftIntervals.push(s);
	    } else if (mid < s[0]) {
	      rightIntervals.push(s);
	    } else {
	      centerIntervals.push(s);
	    }
	  }

	  //Split center intervals
	  var leftPoints = centerIntervals;
	  var rightPoints = centerIntervals.slice();
	  leftPoints.sort(compareBegin);
	  rightPoints.sort(compareEnd);

	  return new IntervalTreeNode(mid, createIntervalTree(leftIntervals), createIntervalTree(rightIntervals), leftPoints, rightPoints);
	}

	//User friendly wrapper that makes it possible to support empty trees
	function IntervalTree(root) {
	  this.root = root;
	}

	var tproto = IntervalTree.prototype;

	tproto.insert = function (interval) {
	  if (this.root) {
	    this.root.insert(interval);
	  } else {
	    this.root = new IntervalTreeNode(interval[0], null, null, [interval], [interval]);
	  }
	};

	tproto.remove = function (interval) {
	  if (this.root) {
	    var r = this.root.remove(interval);
	    if (r === EMPTY) {
	      this.root = null;
	    }
	    return r !== NOT_FOUND;
	  }
	  return false;
	};

	tproto.queryPoint = function (p, cb) {
	  if (this.root) {
	    return this.root.queryPoint(p, cb);
	  }
	};

	tproto.queryInterval = function (lo, hi, cb) {
	  if (lo <= hi && this.root) {
	    return this.root.queryInterval(lo, hi, cb);
	  }
	};

	Object.defineProperty(tproto, "count", {
	  get: function () {
	    if (this.root) {
	      return this.root.count;
	    }
	    return 0;
	  }
	});

	Object.defineProperty(tproto, "intervals", {
	  get: function () {
	    if (this.root) {
	      return this.root.intervals([]);
	    }
	    return [];
	  }
	});

	function createWrapper(intervals) {
	  if (!intervals || intervals.length === 0) {
	    return new IntervalTree(null);
	  }
	  return new IntervalTree(createIntervalTree(intervals));
	}
	});

	var require$$1 = (intervalTree && typeof intervalTree === 'object' && 'default' in intervalTree ? intervalTree['default'] : intervalTree);

	var robustDiff = __commonjs(function (module) {
	"use strict";

	module.exports = robustSubtract;

	//Easy case: Add two scalars
	function scalarScalar(a, b) {
	  var x = a + b;
	  var bv = x - a;
	  var av = x - bv;
	  var br = b - bv;
	  var ar = a - av;
	  var y = ar + br;
	  if (y) {
	    return [y, x];
	  }
	  return [x];
	}

	function robustSubtract(e, f) {
	  var ne = e.length | 0;
	  var nf = f.length | 0;
	  if (ne === 1 && nf === 1) {
	    return scalarScalar(e[0], -f[0]);
	  }
	  var n = ne + nf;
	  var g = new Array(n);
	  var count = 0;
	  var eptr = 0;
	  var fptr = 0;
	  var abs = Math.abs;
	  var ei = e[eptr];
	  var ea = abs(ei);
	  var fi = -f[fptr];
	  var fa = abs(fi);
	  var a, b;
	  if (ea < fa) {
	    b = ei;
	    eptr += 1;
	    if (eptr < ne) {
	      ei = e[eptr];
	      ea = abs(ei);
	    }
	  } else {
	    b = fi;
	    fptr += 1;
	    if (fptr < nf) {
	      fi = -f[fptr];
	      fa = abs(fi);
	    }
	  }
	  if (eptr < ne && ea < fa || fptr >= nf) {
	    a = ei;
	    eptr += 1;
	    if (eptr < ne) {
	      ei = e[eptr];
	      ea = abs(ei);
	    }
	  } else {
	    a = fi;
	    fptr += 1;
	    if (fptr < nf) {
	      fi = -f[fptr];
	      fa = abs(fi);
	    }
	  }
	  var x = a + b;
	  var bv = x - a;
	  var y = b - bv;
	  var q0 = y;
	  var q1 = x;
	  var _x, _bv, _av, _br, _ar;
	  while (eptr < ne && fptr < nf) {
	    if (ea < fa) {
	      a = ei;
	      eptr += 1;
	      if (eptr < ne) {
	        ei = e[eptr];
	        ea = abs(ei);
	      }
	    } else {
	      a = fi;
	      fptr += 1;
	      if (fptr < nf) {
	        fi = -f[fptr];
	        fa = abs(fi);
	      }
	    }
	    b = q0;
	    x = a + b;
	    bv = x - a;
	    y = b - bv;
	    if (y) {
	      g[count++] = y;
	    }
	    _x = q1 + x;
	    _bv = _x - q1;
	    _av = _x - _bv;
	    _br = x - _bv;
	    _ar = q1 - _av;
	    q0 = _ar + _br;
	    q1 = _x;
	  }
	  while (eptr < ne) {
	    a = ei;
	    b = q0;
	    x = a + b;
	    bv = x - a;
	    y = b - bv;
	    if (y) {
	      g[count++] = y;
	    }
	    _x = q1 + x;
	    _bv = _x - q1;
	    _av = _x - _bv;
	    _br = x - _bv;
	    _ar = q1 - _av;
	    q0 = _ar + _br;
	    q1 = _x;
	    eptr += 1;
	    if (eptr < ne) {
	      ei = e[eptr];
	    }
	  }
	  while (fptr < nf) {
	    a = fi;
	    b = q0;
	    x = a + b;
	    bv = x - a;
	    y = b - bv;
	    if (y) {
	      g[count++] = y;
	    }
	    _x = q1 + x;
	    _bv = _x - q1;
	    _av = _x - _bv;
	    _br = x - _bv;
	    _ar = q1 - _av;
	    q0 = _ar + _br;
	    q1 = _x;
	    fptr += 1;
	    if (fptr < nf) {
	      fi = -f[fptr];
	    }
	  }
	  if (q0) {
	    g[count++] = q0;
	  }
	  if (q1) {
	    g[count++] = q1;
	  }
	  if (!count) {
	    g[count++] = 0.0;
	  }
	  g.length = count;
	  return g;
	}
	});

	var require$$0$2 = (robustDiff && typeof robustDiff === 'object' && 'default' in robustDiff ? robustDiff['default'] : robustDiff);

	var twoSum = __commonjs(function (module) {
	"use strict";

	module.exports = fastTwoSum;

	function fastTwoSum(a, b, result) {
		var x = a + b;
		var bv = x - a;
		var av = x - bv;
		var br = b - bv;
		var ar = a - av;
		if (result) {
			result[0] = ar + br;
			result[1] = x;
			return result;
		}
		return [ar + br, x];
	}
	});

	var require$$0$3 = (twoSum && typeof twoSum === 'object' && 'default' in twoSum ? twoSum['default'] : twoSum);

	var twoProduct = __commonjs(function (module) {
	"use strict";

	module.exports = twoProduct;

	var SPLITTER = +(Math.pow(2, 27) + 1.0);

	function twoProduct(a, b, result) {
	  var x = a * b;

	  var c = SPLITTER * a;
	  var abig = c - a;
	  var ahi = c - abig;
	  var alo = a - ahi;

	  var d = SPLITTER * b;
	  var bbig = d - b;
	  var bhi = d - bbig;
	  var blo = b - bhi;

	  var err1 = x - ahi * bhi;
	  var err2 = err1 - alo * bhi;
	  var err3 = err2 - ahi * blo;

	  var y = alo * blo - err3;

	  if (result) {
	    result[0] = y;
	    result[1] = x;
	    return result;
	  }

	  return [y, x];
	}
	});

	var require$$1$2 = (twoProduct && typeof twoProduct === 'object' && 'default' in twoProduct ? twoProduct['default'] : twoProduct);

	var robustScale = __commonjs(function (module) {
	"use strict";

	var twoProduct = require$$1$2;
	var twoSum = require$$0$3;

	module.exports = scaleLinearExpansion;

	function scaleLinearExpansion(e, scale) {
	  var n = e.length;
	  if (n === 1) {
	    var ts = twoProduct(e[0], scale);
	    if (ts[0]) {
	      return ts;
	    }
	    return [ts[1]];
	  }
	  var g = new Array(2 * n);
	  var q = [0.1, 0.1];
	  var t = [0.1, 0.1];
	  var count = 0;
	  twoProduct(e[0], scale, q);
	  if (q[0]) {
	    g[count++] = q[0];
	  }
	  for (var i = 1; i < n; ++i) {
	    twoProduct(e[i], scale, t);
	    var pq = q[1];
	    twoSum(pq, t[0], q);
	    if (q[0]) {
	      g[count++] = q[0];
	    }
	    var a = t[1];
	    var b = q[1];
	    var x = a + b;
	    var bv = x - a;
	    var y = b - bv;
	    q[1] = x;
	    if (y) {
	      g[count++] = y;
	    }
	  }
	  if (q[1]) {
	    g[count++] = q[1];
	  }
	  if (count === 0) {
	    g[count++] = 0.0;
	  }
	  g.length = count;
	  return g;
	}
	});

	var require$$1$1 = (robustScale && typeof robustScale === 'object' && 'default' in robustScale ? robustScale['default'] : robustScale);

	var robustSum = __commonjs(function (module) {
	"use strict";

	module.exports = linearExpansionSum;

	//Easy case: Add two scalars
	function scalarScalar(a, b) {
	  var x = a + b;
	  var bv = x - a;
	  var av = x - bv;
	  var br = b - bv;
	  var ar = a - av;
	  var y = ar + br;
	  if (y) {
	    return [y, x];
	  }
	  return [x];
	}

	function linearExpansionSum(e, f) {
	  var ne = e.length | 0;
	  var nf = f.length | 0;
	  if (ne === 1 && nf === 1) {
	    return scalarScalar(e[0], f[0]);
	  }
	  var n = ne + nf;
	  var g = new Array(n);
	  var count = 0;
	  var eptr = 0;
	  var fptr = 0;
	  var abs = Math.abs;
	  var ei = e[eptr];
	  var ea = abs(ei);
	  var fi = f[fptr];
	  var fa = abs(fi);
	  var a, b;
	  if (ea < fa) {
	    b = ei;
	    eptr += 1;
	    if (eptr < ne) {
	      ei = e[eptr];
	      ea = abs(ei);
	    }
	  } else {
	    b = fi;
	    fptr += 1;
	    if (fptr < nf) {
	      fi = f[fptr];
	      fa = abs(fi);
	    }
	  }
	  if (eptr < ne && ea < fa || fptr >= nf) {
	    a = ei;
	    eptr += 1;
	    if (eptr < ne) {
	      ei = e[eptr];
	      ea = abs(ei);
	    }
	  } else {
	    a = fi;
	    fptr += 1;
	    if (fptr < nf) {
	      fi = f[fptr];
	      fa = abs(fi);
	    }
	  }
	  var x = a + b;
	  var bv = x - a;
	  var y = b - bv;
	  var q0 = y;
	  var q1 = x;
	  var _x, _bv, _av, _br, _ar;
	  while (eptr < ne && fptr < nf) {
	    if (ea < fa) {
	      a = ei;
	      eptr += 1;
	      if (eptr < ne) {
	        ei = e[eptr];
	        ea = abs(ei);
	      }
	    } else {
	      a = fi;
	      fptr += 1;
	      if (fptr < nf) {
	        fi = f[fptr];
	        fa = abs(fi);
	      }
	    }
	    b = q0;
	    x = a + b;
	    bv = x - a;
	    y = b - bv;
	    if (y) {
	      g[count++] = y;
	    }
	    _x = q1 + x;
	    _bv = _x - q1;
	    _av = _x - _bv;
	    _br = x - _bv;
	    _ar = q1 - _av;
	    q0 = _ar + _br;
	    q1 = _x;
	  }
	  while (eptr < ne) {
	    a = ei;
	    b = q0;
	    x = a + b;
	    bv = x - a;
	    y = b - bv;
	    if (y) {
	      g[count++] = y;
	    }
	    _x = q1 + x;
	    _bv = _x - q1;
	    _av = _x - _bv;
	    _br = x - _bv;
	    _ar = q1 - _av;
	    q0 = _ar + _br;
	    q1 = _x;
	    eptr += 1;
	    if (eptr < ne) {
	      ei = e[eptr];
	    }
	  }
	  while (fptr < nf) {
	    a = fi;
	    b = q0;
	    x = a + b;
	    bv = x - a;
	    y = b - bv;
	    if (y) {
	      g[count++] = y;
	    }
	    _x = q1 + x;
	    _bv = _x - q1;
	    _av = _x - _bv;
	    _br = x - _bv;
	    _ar = q1 - _av;
	    q0 = _ar + _br;
	    q1 = _x;
	    fptr += 1;
	    if (fptr < nf) {
	      fi = f[fptr];
	    }
	  }
	  if (q0) {
	    g[count++] = q0;
	  }
	  if (q1) {
	    g[count++] = q1;
	  }
	  if (!count) {
	    g[count++] = 0.0;
	  }
	  g.length = count;
	  return g;
	}
	});

	var require$$2$1 = (robustSum && typeof robustSum === 'object' && 'default' in robustSum ? robustSum['default'] : robustSum);

	var orientation = __commonjs(function (module) {
	"use strict";

	var twoProduct = require$$1$2;
	var robustSum = require$$2$1;
	var robustScale = require$$1$1;
	var robustSubtract = require$$0$2;

	var NUM_EXPAND = 5;

	var EPSILON = 1.1102230246251565e-16;
	var ERRBOUND3 = (3.0 + 16.0 * EPSILON) * EPSILON;
	var ERRBOUND4 = (7.0 + 56.0 * EPSILON) * EPSILON;

	function cofactor(m, c) {
	  var result = new Array(m.length - 1);
	  for (var i = 1; i < m.length; ++i) {
	    var r = result[i - 1] = new Array(m.length - 1);
	    for (var j = 0, k = 0; j < m.length; ++j) {
	      if (j === c) {
	        continue;
	      }
	      r[k++] = m[i][j];
	    }
	  }
	  return result;
	}

	function matrix(n) {
	  var result = new Array(n);
	  for (var i = 0; i < n; ++i) {
	    result[i] = new Array(n);
	    for (var j = 0; j < n; ++j) {
	      result[i][j] = ["m", j, "[", n - i - 1, "]"].join("");
	    }
	  }
	  return result;
	}

	function sign(n) {
	  if (n & 1) {
	    return "-";
	  }
	  return "";
	}

	function generateSum(expr) {
	  if (expr.length === 1) {
	    return expr[0];
	  } else if (expr.length === 2) {
	    return ["sum(", expr[0], ",", expr[1], ")"].join("");
	  } else {
	    var m = expr.length >> 1;
	    return ["sum(", generateSum(expr.slice(0, m)), ",", generateSum(expr.slice(m)), ")"].join("");
	  }
	}

	function determinant(m) {
	  if (m.length === 2) {
	    return [["sum(prod(", m[0][0], ",", m[1][1], "),prod(-", m[0][1], ",", m[1][0], "))"].join("")];
	  } else {
	    var expr = [];
	    for (var i = 0; i < m.length; ++i) {
	      expr.push(["scale(", generateSum(determinant(cofactor(m, i))), ",", sign(i), m[0][i], ")"].join(""));
	    }
	    return expr;
	  }
	}

	function orientation(n) {
	  var pos = [];
	  var neg = [];
	  var m = matrix(n);
	  var args = [];
	  for (var i = 0; i < n; ++i) {
	    if ((i & 1) === 0) {
	      pos.push.apply(pos, determinant(cofactor(m, i)));
	    } else {
	      neg.push.apply(neg, determinant(cofactor(m, i)));
	    }
	    args.push("m" + i);
	  }
	  var posExpr = generateSum(pos);
	  var negExpr = generateSum(neg);
	  var funcName = "orientation" + n + "Exact";
	  var code = ["function ", funcName, "(", args.join(), "){var p=", posExpr, ",n=", negExpr, ",d=sub(p,n);\
return d[d.length-1];};return ", funcName].join("");
	  var proc = new Function("sum", "prod", "scale", "sub", code);
	  return proc(robustSum, twoProduct, robustScale, robustSubtract);
	}

	var orientation3Exact = orientation(3);
	var orientation4Exact = orientation(4);

	var CACHED = [function orientation0() {
	  return 0;
	}, function orientation1() {
	  return 0;
	}, function orientation2(a, b) {
	  return b[0] - a[0];
	}, function orientation3(a, b, c) {
	  var l = (a[1] - c[1]) * (b[0] - c[0]);
	  var r = (a[0] - c[0]) * (b[1] - c[1]);
	  var det = l - r;
	  var s;
	  if (l > 0) {
	    if (r <= 0) {
	      return det;
	    } else {
	      s = l + r;
	    }
	  } else if (l < 0) {
	    if (r >= 0) {
	      return det;
	    } else {
	      s = -(l + r);
	    }
	  } else {
	    return det;
	  }
	  var tol = ERRBOUND3 * s;
	  if (det >= tol || det <= -tol) {
	    return det;
	  }
	  return orientation3Exact(a, b, c);
	}, function orientation4(a, b, c, d) {
	  var adx = a[0] - d[0];
	  var bdx = b[0] - d[0];
	  var cdx = c[0] - d[0];
	  var ady = a[1] - d[1];
	  var bdy = b[1] - d[1];
	  var cdy = c[1] - d[1];
	  var adz = a[2] - d[2];
	  var bdz = b[2] - d[2];
	  var cdz = c[2] - d[2];
	  var bdxcdy = bdx * cdy;
	  var cdxbdy = cdx * bdy;
	  var cdxady = cdx * ady;
	  var adxcdy = adx * cdy;
	  var adxbdy = adx * bdy;
	  var bdxady = bdx * ady;
	  var det = adz * (bdxcdy - cdxbdy) + bdz * (cdxady - adxcdy) + cdz * (adxbdy - bdxady);
	  var permanent = (Math.abs(bdxcdy) + Math.abs(cdxbdy)) * Math.abs(adz) + (Math.abs(cdxady) + Math.abs(adxcdy)) * Math.abs(bdz) + (Math.abs(adxbdy) + Math.abs(bdxady)) * Math.abs(cdz);
	  var tol = ERRBOUND4 * permanent;
	  if (det > tol || -det > tol) {
	    return det;
	  }
	  return orientation4Exact(a, b, c, d);
	}];

	function slowOrient(args) {
	  var proc = CACHED[args.length];
	  if (!proc) {
	    proc = CACHED[args.length] = orientation(args.length);
	  }
	  return proc.apply(undefined, args);
	}

	function generateOrientationProc() {
	  while (CACHED.length <= NUM_EXPAND) {
	    CACHED.push(orientation(CACHED.length));
	  }
	  var args = [];
	  var procArgs = ["slow"];
	  for (var i = 0; i <= NUM_EXPAND; ++i) {
	    args.push("a" + i);
	    procArgs.push("o" + i);
	  }
	  var code = ["function getOrientation(", args.join(), "){switch(arguments.length){case 0:case 1:return 0;"];
	  for (var i = 2; i <= NUM_EXPAND; ++i) {
	    code.push("case ", i, ":return o", i, "(", args.slice(0, i).join(), ");");
	  }
	  code.push("}var s=new Array(arguments.length);for(var i=0;i<arguments.length;++i){s[i]=arguments[i]};return slow(s);}return getOrientation");
	  procArgs.push(code.join(""));

	  var proc = Function.apply(undefined, procArgs);
	  module.exports = proc.apply(undefined, [slowOrient].concat(CACHED));
	  for (var i = 0; i <= NUM_EXPAND; ++i) {
	    module.exports[i] = CACHED[i];
	  }
	}

	generateOrientationProc();
	});

	var require$$0$1 = (orientation && typeof orientation === 'object' && 'default' in orientation ? orientation['default'] : orientation);

	var orderSegments = __commonjs(function (module) {
	"use strict";

	module.exports = orderSegments;

	var orient = require$$0$1;

	function horizontalOrder(a, b) {
	  var bl, br;
	  if (b[0][0] < b[1][0]) {
	    bl = b[0];
	    br = b[1];
	  } else if (b[0][0] > b[1][0]) {
	    bl = b[1];
	    br = b[0];
	  } else {
	    var alo = Math.min(a[0][1], a[1][1]);
	    var ahi = Math.max(a[0][1], a[1][1]);
	    var blo = Math.min(b[0][1], b[1][1]);
	    var bhi = Math.max(b[0][1], b[1][1]);
	    if (ahi < blo) {
	      return ahi - blo;
	    }
	    if (alo > bhi) {
	      return alo - bhi;
	    }
	    return ahi - bhi;
	  }
	  var al, ar;
	  if (a[0][1] < a[1][1]) {
	    al = a[0];
	    ar = a[1];
	  } else {
	    al = a[1];
	    ar = a[0];
	  }
	  var d = orient(br, bl, al);
	  if (d) {
	    return d;
	  }
	  d = orient(br, bl, ar);
	  if (d) {
	    return d;
	  }
	  return ar - br;
	}

	function orderSegments(b, a) {
	  var al, ar;
	  if (a[0][0] < a[1][0]) {
	    al = a[0];
	    ar = a[1];
	  } else if (a[0][0] > a[1][0]) {
	    al = a[1];
	    ar = a[0];
	  } else {
	    return horizontalOrder(a, b);
	  }
	  var bl, br;
	  if (b[0][0] < b[1][0]) {
	    bl = b[0];
	    br = b[1];
	  } else if (b[0][0] > b[1][0]) {
	    bl = b[1];
	    br = b[0];
	  } else {
	    return -horizontalOrder(b, a);
	  }
	  var d1 = orient(al, ar, br);
	  var d2 = orient(al, ar, bl);
	  if (d1 < 0) {
	    if (d2 <= 0) {
	      return d1;
	    }
	  } else if (d1 > 0) {
	    if (d2 >= 0) {
	      return d1;
	    }
	  } else if (d2) {
	    return d2;
	  }
	  d1 = orient(br, bl, ar);
	  d2 = orient(br, bl, al);
	  if (d1 < 0) {
	    if (d2 <= 0) {
	      return d1;
	    }
	  } else if (d1 > 0) {
	    if (d2 >= 0) {
	      return d1;
	    }
	  } else if (d2) {
	    return d2;
	  }
	  return ar[0] - br[0];
	}
	});

	var require$$0 = (orderSegments && typeof orderSegments === 'object' && 'default' in orderSegments ? orderSegments['default'] : orderSegments);

	var rbtree = __commonjs(function (module) {
	"use strict";

	module.exports = createRBTree;

	var RED = 0;
	var BLACK = 1;

	function RBNode(color, key, value, left, right, count) {
	  this._color = color;
	  this.key = key;
	  this.value = value;
	  this.left = left;
	  this.right = right;
	  this._count = count;
	}

	function cloneNode(node) {
	  return new RBNode(node._color, node.key, node.value, node.left, node.right, node._count);
	}

	function repaint(color, node) {
	  return new RBNode(color, node.key, node.value, node.left, node.right, node._count);
	}

	function recount(node) {
	  node._count = 1 + (node.left ? node.left._count : 0) + (node.right ? node.right._count : 0);
	}

	function RedBlackTree(compare, root) {
	  this._compare = compare;
	  this.root = root;
	}

	var proto = RedBlackTree.prototype;

	Object.defineProperty(proto, "keys", {
	  get: function () {
	    var result = [];
	    this.forEach(function (k, v) {
	      result.push(k);
	    });
	    return result;
	  }
	});

	Object.defineProperty(proto, "values", {
	  get: function () {
	    var result = [];
	    this.forEach(function (k, v) {
	      result.push(v);
	    });
	    return result;
	  }
	});

	//Returns the number of nodes in the tree
	Object.defineProperty(proto, "length", {
	  get: function () {
	    if (this.root) {
	      return this.root._count;
	    }
	    return 0;
	  }
	});

	//Insert a new item into the tree
	proto.insert = function (key, value) {
	  var cmp = this._compare;
	  //Find point to insert new node at
	  var n = this.root;
	  var n_stack = [];
	  var d_stack = [];
	  while (n) {
	    var d = cmp(key, n.key);
	    n_stack.push(n);
	    d_stack.push(d);
	    if (d <= 0) {
	      n = n.left;
	    } else {
	      n = n.right;
	    }
	  }
	  //Rebuild path to leaf node
	  n_stack.push(new RBNode(RED, key, value, null, null, 1));
	  for (var s = n_stack.length - 2; s >= 0; --s) {
	    var n = n_stack[s];
	    if (d_stack[s] <= 0) {
	      n_stack[s] = new RBNode(n._color, n.key, n.value, n_stack[s + 1], n.right, n._count + 1);
	    } else {
	      n_stack[s] = new RBNode(n._color, n.key, n.value, n.left, n_stack[s + 1], n._count + 1);
	    }
	  }
	  //Rebalance tree using rotations
	  //console.log("start insert", key, d_stack)
	  for (var s = n_stack.length - 1; s > 1; --s) {
	    var p = n_stack[s - 1];
	    var n = n_stack[s];
	    if (p._color === BLACK || n._color === BLACK) {
	      break;
	    }
	    var pp = n_stack[s - 2];
	    if (pp.left === p) {
	      if (p.left === n) {
	        var y = pp.right;
	        if (y && y._color === RED) {
	          //console.log("LLr")
	          p._color = BLACK;
	          pp.right = repaint(BLACK, y);
	          pp._color = RED;
	          s -= 1;
	        } else {
	          //console.log("LLb")
	          pp._color = RED;
	          pp.left = p.right;
	          p._color = BLACK;
	          p.right = pp;
	          n_stack[s - 2] = p;
	          n_stack[s - 1] = n;
	          recount(pp);
	          recount(p);
	          if (s >= 3) {
	            var ppp = n_stack[s - 3];
	            if (ppp.left === pp) {
	              ppp.left = p;
	            } else {
	              ppp.right = p;
	            }
	          }
	          break;
	        }
	      } else {
	        var y = pp.right;
	        if (y && y._color === RED) {
	          //console.log("LRr")
	          p._color = BLACK;
	          pp.right = repaint(BLACK, y);
	          pp._color = RED;
	          s -= 1;
	        } else {
	          //console.log("LRb")
	          p.right = n.left;
	          pp._color = RED;
	          pp.left = n.right;
	          n._color = BLACK;
	          n.left = p;
	          n.right = pp;
	          n_stack[s - 2] = n;
	          n_stack[s - 1] = p;
	          recount(pp);
	          recount(p);
	          recount(n);
	          if (s >= 3) {
	            var ppp = n_stack[s - 3];
	            if (ppp.left === pp) {
	              ppp.left = n;
	            } else {
	              ppp.right = n;
	            }
	          }
	          break;
	        }
	      }
	    } else {
	      if (p.right === n) {
	        var y = pp.left;
	        if (y && y._color === RED) {
	          //console.log("RRr", y.key)
	          p._color = BLACK;
	          pp.left = repaint(BLACK, y);
	          pp._color = RED;
	          s -= 1;
	        } else {
	          //console.log("RRb")
	          pp._color = RED;
	          pp.right = p.left;
	          p._color = BLACK;
	          p.left = pp;
	          n_stack[s - 2] = p;
	          n_stack[s - 1] = n;
	          recount(pp);
	          recount(p);
	          if (s >= 3) {
	            var ppp = n_stack[s - 3];
	            if (ppp.right === pp) {
	              ppp.right = p;
	            } else {
	              ppp.left = p;
	            }
	          }
	          break;
	        }
	      } else {
	        var y = pp.left;
	        if (y && y._color === RED) {
	          //console.log("RLr")
	          p._color = BLACK;
	          pp.left = repaint(BLACK, y);
	          pp._color = RED;
	          s -= 1;
	        } else {
	          //console.log("RLb")
	          p.left = n.right;
	          pp._color = RED;
	          pp.right = n.left;
	          n._color = BLACK;
	          n.right = p;
	          n.left = pp;
	          n_stack[s - 2] = n;
	          n_stack[s - 1] = p;
	          recount(pp);
	          recount(p);
	          recount(n);
	          if (s >= 3) {
	            var ppp = n_stack[s - 3];
	            if (ppp.right === pp) {
	              ppp.right = n;
	            } else {
	              ppp.left = n;
	            }
	          }
	          break;
	        }
	      }
	    }
	  }
	  //Return new tree
	  n_stack[0]._color = BLACK;
	  return new RedBlackTree(cmp, n_stack[0]);
	};

	//Visit all nodes inorder
	function doVisitFull(visit, node) {
	  if (node.left) {
	    var v = doVisitFull(visit, node.left);
	    if (v) {
	      return v;
	    }
	  }
	  var v = visit(node.key, node.value);
	  if (v) {
	    return v;
	  }
	  if (node.right) {
	    return doVisitFull(visit, node.right);
	  }
	}

	//Visit half nodes in order
	function doVisitHalf(lo, compare, visit, node) {
	  var l = compare(lo, node.key);
	  if (l <= 0) {
	    if (node.left) {
	      var v = doVisitHalf(lo, compare, visit, node.left);
	      if (v) {
	        return v;
	      }
	    }
	    var v = visit(node.key, node.value);
	    if (v) {
	      return v;
	    }
	  }
	  if (node.right) {
	    return doVisitHalf(lo, compare, visit, node.right);
	  }
	}

	//Visit all nodes within a range
	function doVisit(lo, hi, compare, visit, node) {
	  var l = compare(lo, node.key);
	  var h = compare(hi, node.key);
	  var v;
	  if (l <= 0) {
	    if (node.left) {
	      v = doVisit(lo, hi, compare, visit, node.left);
	      if (v) {
	        return v;
	      }
	    }
	    if (h > 0) {
	      v = visit(node.key, node.value);
	      if (v) {
	        return v;
	      }
	    }
	  }
	  if (h > 0 && node.right) {
	    return doVisit(lo, hi, compare, visit, node.right);
	  }
	}

	proto.forEach = function rbTreeForEach(visit, lo, hi) {
	  if (!this.root) {
	    return;
	  }
	  switch (arguments.length) {
	    case 1:
	      return doVisitFull(visit, this.root);
	      break;

	    case 2:
	      return doVisitHalf(lo, this._compare, visit, this.root);
	      break;

	    case 3:
	      if (this._compare(lo, hi) >= 0) {
	        return;
	      }
	      return doVisit(lo, hi, this._compare, visit, this.root);
	      break;
	  }
	};

	//First item in list
	Object.defineProperty(proto, "begin", {
	  get: function () {
	    var stack = [];
	    var n = this.root;
	    while (n) {
	      stack.push(n);
	      n = n.left;
	    }
	    return new RedBlackTreeIterator(this, stack);
	  }
	});

	//Last item in list
	Object.defineProperty(proto, "end", {
	  get: function () {
	    var stack = [];
	    var n = this.root;
	    while (n) {
	      stack.push(n);
	      n = n.right;
	    }
	    return new RedBlackTreeIterator(this, stack);
	  }
	});

	//Find the ith item in the tree
	proto.at = function (idx) {
	  if (idx < 0) {
	    return new RedBlackTreeIterator(this, []);
	  }
	  var n = this.root;
	  var stack = [];
	  while (true) {
	    stack.push(n);
	    if (n.left) {
	      if (idx < n.left._count) {
	        n = n.left;
	        continue;
	      }
	      idx -= n.left._count;
	    }
	    if (!idx) {
	      return new RedBlackTreeIterator(this, stack);
	    }
	    idx -= 1;
	    if (n.right) {
	      if (idx >= n.right._count) {
	        break;
	      }
	      n = n.right;
	    } else {
	      break;
	    }
	  }
	  return new RedBlackTreeIterator(this, []);
	};

	proto.ge = function (key) {
	  var cmp = this._compare;
	  var n = this.root;
	  var stack = [];
	  var last_ptr = 0;
	  while (n) {
	    var d = cmp(key, n.key);
	    stack.push(n);
	    if (d <= 0) {
	      last_ptr = stack.length;
	    }
	    if (d <= 0) {
	      n = n.left;
	    } else {
	      n = n.right;
	    }
	  }
	  stack.length = last_ptr;
	  return new RedBlackTreeIterator(this, stack);
	};

	proto.gt = function (key) {
	  var cmp = this._compare;
	  var n = this.root;
	  var stack = [];
	  var last_ptr = 0;
	  while (n) {
	    var d = cmp(key, n.key);
	    stack.push(n);
	    if (d < 0) {
	      last_ptr = stack.length;
	    }
	    if (d < 0) {
	      n = n.left;
	    } else {
	      n = n.right;
	    }
	  }
	  stack.length = last_ptr;
	  return new RedBlackTreeIterator(this, stack);
	};

	proto.lt = function (key) {
	  var cmp = this._compare;
	  var n = this.root;
	  var stack = [];
	  var last_ptr = 0;
	  while (n) {
	    var d = cmp(key, n.key);
	    stack.push(n);
	    if (d > 0) {
	      last_ptr = stack.length;
	    }
	    if (d <= 0) {
	      n = n.left;
	    } else {
	      n = n.right;
	    }
	  }
	  stack.length = last_ptr;
	  return new RedBlackTreeIterator(this, stack);
	};

	proto.le = function (key) {
	  var cmp = this._compare;
	  var n = this.root;
	  var stack = [];
	  var last_ptr = 0;
	  while (n) {
	    var d = cmp(key, n.key);
	    stack.push(n);
	    if (d >= 0) {
	      last_ptr = stack.length;
	    }
	    if (d < 0) {
	      n = n.left;
	    } else {
	      n = n.right;
	    }
	  }
	  stack.length = last_ptr;
	  return new RedBlackTreeIterator(this, stack);
	};

	//Finds the item with key if it exists
	proto.find = function (key) {
	  var cmp = this._compare;
	  var n = this.root;
	  var stack = [];
	  while (n) {
	    var d = cmp(key, n.key);
	    stack.push(n);
	    if (d === 0) {
	      return new RedBlackTreeIterator(this, stack);
	    }
	    if (d <= 0) {
	      n = n.left;
	    } else {
	      n = n.right;
	    }
	  }
	  return new RedBlackTreeIterator(this, []);
	};

	//Removes item with key from tree
	proto.remove = function (key) {
	  var iter = this.find(key);
	  if (iter) {
	    return iter.remove();
	  }
	  return this;
	};

	//Returns the item at `key`
	proto.get = function (key) {
	  var cmp = this._compare;
	  var n = this.root;
	  while (n) {
	    var d = cmp(key, n.key);
	    if (d === 0) {
	      return n.value;
	    }
	    if (d <= 0) {
	      n = n.left;
	    } else {
	      n = n.right;
	    }
	  }
	  return;
	};

	//Iterator for red black tree
	function RedBlackTreeIterator(tree, stack) {
	  this.tree = tree;
	  this._stack = stack;
	}

	var iproto = RedBlackTreeIterator.prototype;

	//Test if iterator is valid
	Object.defineProperty(iproto, "valid", {
	  get: function () {
	    return this._stack.length > 0;
	  }
	});

	//Node of the iterator
	Object.defineProperty(iproto, "node", {
	  get: function () {
	    if (this._stack.length > 0) {
	      return this._stack[this._stack.length - 1];
	    }
	    return null;
	  },
	  enumerable: true
	});

	//Makes a copy of an iterator
	iproto.clone = function () {
	  return new RedBlackTreeIterator(this.tree, this._stack.slice());
	};

	//Swaps two nodes
	function swapNode(n, v) {
	  n.key = v.key;
	  n.value = v.value;
	  n.left = v.left;
	  n.right = v.right;
	  n._color = v._color;
	  n._count = v._count;
	}

	//Fix up a double black node in a tree
	function fixDoubleBlack(stack) {
	  var n, p, s, z;
	  for (var i = stack.length - 1; i >= 0; --i) {
	    n = stack[i];
	    if (i === 0) {
	      n._color = BLACK;
	      return;
	    }
	    //console.log("visit node:", n.key, i, stack[i].key, stack[i-1].key)
	    p = stack[i - 1];
	    if (p.left === n) {
	      //console.log("left child")
	      s = p.right;
	      if (s.right && s.right._color === RED) {
	        //console.log("case 1: right sibling child red")
	        s = p.right = cloneNode(s);
	        z = s.right = cloneNode(s.right);
	        p.right = s.left;
	        s.left = p;
	        s.right = z;
	        s._color = p._color;
	        n._color = BLACK;
	        p._color = BLACK;
	        z._color = BLACK;
	        recount(p);
	        recount(s);
	        if (i > 1) {
	          var pp = stack[i - 2];
	          if (pp.left === p) {
	            pp.left = s;
	          } else {
	            pp.right = s;
	          }
	        }
	        stack[i - 1] = s;
	        return;
	      } else if (s.left && s.left._color === RED) {
	        //console.log("case 1: left sibling child red")
	        s = p.right = cloneNode(s);
	        z = s.left = cloneNode(s.left);
	        p.right = z.left;
	        s.left = z.right;
	        z.left = p;
	        z.right = s;
	        z._color = p._color;
	        p._color = BLACK;
	        s._color = BLACK;
	        n._color = BLACK;
	        recount(p);
	        recount(s);
	        recount(z);
	        if (i > 1) {
	          var pp = stack[i - 2];
	          if (pp.left === p) {
	            pp.left = z;
	          } else {
	            pp.right = z;
	          }
	        }
	        stack[i - 1] = z;
	        return;
	      }
	      if (s._color === BLACK) {
	        if (p._color === RED) {
	          //console.log("case 2: black sibling, red parent", p.right.value)
	          p._color = BLACK;
	          p.right = repaint(RED, s);
	          return;
	        } else {
	          //console.log("case 2: black sibling, black parent", p.right.value)
	          p.right = repaint(RED, s);
	          continue;
	        }
	      } else {
	        //console.log("case 3: red sibling")
	        s = cloneNode(s);
	        p.right = s.left;
	        s.left = p;
	        s._color = p._color;
	        p._color = RED;
	        recount(p);
	        recount(s);
	        if (i > 1) {
	          var pp = stack[i - 2];
	          if (pp.left === p) {
	            pp.left = s;
	          } else {
	            pp.right = s;
	          }
	        }
	        stack[i - 1] = s;
	        stack[i] = p;
	        if (i + 1 < stack.length) {
	          stack[i + 1] = n;
	        } else {
	          stack.push(n);
	        }
	        i = i + 2;
	      }
	    } else {
	      //console.log("right child")
	      s = p.left;
	      if (s.left && s.left._color === RED) {
	        //console.log("case 1: left sibling child red", p.value, p._color)
	        s = p.left = cloneNode(s);
	        z = s.left = cloneNode(s.left);
	        p.left = s.right;
	        s.right = p;
	        s.left = z;
	        s._color = p._color;
	        n._color = BLACK;
	        p._color = BLACK;
	        z._color = BLACK;
	        recount(p);
	        recount(s);
	        if (i > 1) {
	          var pp = stack[i - 2];
	          if (pp.right === p) {
	            pp.right = s;
	          } else {
	            pp.left = s;
	          }
	        }
	        stack[i - 1] = s;
	        return;
	      } else if (s.right && s.right._color === RED) {
	        //console.log("case 1: right sibling child red")
	        s = p.left = cloneNode(s);
	        z = s.right = cloneNode(s.right);
	        p.left = z.right;
	        s.right = z.left;
	        z.right = p;
	        z.left = s;
	        z._color = p._color;
	        p._color = BLACK;
	        s._color = BLACK;
	        n._color = BLACK;
	        recount(p);
	        recount(s);
	        recount(z);
	        if (i > 1) {
	          var pp = stack[i - 2];
	          if (pp.right === p) {
	            pp.right = z;
	          } else {
	            pp.left = z;
	          }
	        }
	        stack[i - 1] = z;
	        return;
	      }
	      if (s._color === BLACK) {
	        if (p._color === RED) {
	          //console.log("case 2: black sibling, red parent")
	          p._color = BLACK;
	          p.left = repaint(RED, s);
	          return;
	        } else {
	          //console.log("case 2: black sibling, black parent")
	          p.left = repaint(RED, s);
	          continue;
	        }
	      } else {
	        //console.log("case 3: red sibling")
	        s = cloneNode(s);
	        p.left = s.right;
	        s.right = p;
	        s._color = p._color;
	        p._color = RED;
	        recount(p);
	        recount(s);
	        if (i > 1) {
	          var pp = stack[i - 2];
	          if (pp.right === p) {
	            pp.right = s;
	          } else {
	            pp.left = s;
	          }
	        }
	        stack[i - 1] = s;
	        stack[i] = p;
	        if (i + 1 < stack.length) {
	          stack[i + 1] = n;
	        } else {
	          stack.push(n);
	        }
	        i = i + 2;
	      }
	    }
	  }
	}

	//Removes item at iterator from tree
	iproto.remove = function () {
	  var stack = this._stack;
	  if (stack.length === 0) {
	    return this.tree;
	  }
	  //First copy path to node
	  var cstack = new Array(stack.length);
	  var n = stack[stack.length - 1];
	  cstack[cstack.length - 1] = new RBNode(n._color, n.key, n.value, n.left, n.right, n._count);
	  for (var i = stack.length - 2; i >= 0; --i) {
	    var n = stack[i];
	    if (n.left === stack[i + 1]) {
	      cstack[i] = new RBNode(n._color, n.key, n.value, cstack[i + 1], n.right, n._count);
	    } else {
	      cstack[i] = new RBNode(n._color, n.key, n.value, n.left, cstack[i + 1], n._count);
	    }
	  }

	  //Get node
	  n = cstack[cstack.length - 1];
	  //console.log("start remove: ", n.value)

	  //If not leaf, then swap with previous node
	  if (n.left && n.right) {
	    //console.log("moving to leaf")

	    //First walk to previous leaf
	    var split = cstack.length;
	    n = n.left;
	    while (n.right) {
	      cstack.push(n);
	      n = n.right;
	    }
	    //Copy path to leaf
	    var v = cstack[split - 1];
	    cstack.push(new RBNode(n._color, v.key, v.value, n.left, n.right, n._count));
	    cstack[split - 1].key = n.key;
	    cstack[split - 1].value = n.value;

	    //Fix up stack
	    for (var i = cstack.length - 2; i >= split; --i) {
	      n = cstack[i];
	      cstack[i] = new RBNode(n._color, n.key, n.value, n.left, cstack[i + 1], n._count);
	    }
	    cstack[split - 1].left = cstack[split];
	  }
	  //console.log("stack=", cstack.map(function(v) { return v.value }))

	  //Remove leaf node
	  n = cstack[cstack.length - 1];
	  if (n._color === RED) {
	    //Easy case: removing red leaf
	    //console.log("RED leaf")
	    var p = cstack[cstack.length - 2];
	    if (p.left === n) {
	      p.left = null;
	    } else if (p.right === n) {
	      p.right = null;
	    }
	    cstack.pop();
	    for (var i = 0; i < cstack.length; ++i) {
	      cstack[i]._count--;
	    }
	    return new RedBlackTree(this.tree._compare, cstack[0]);
	  } else {
	    if (n.left || n.right) {
	      //Second easy case:  Single child black parent
	      //console.log("BLACK single child")
	      if (n.left) {
	        swapNode(n, n.left);
	      } else if (n.right) {
	        swapNode(n, n.right);
	      }
	      //Child must be red, so repaint it black to balance color
	      n._color = BLACK;
	      for (var i = 0; i < cstack.length - 1; ++i) {
	        cstack[i]._count--;
	      }
	      return new RedBlackTree(this.tree._compare, cstack[0]);
	    } else if (cstack.length === 1) {
	      //Third easy case: root
	      //console.log("ROOT")
	      return new RedBlackTree(this.tree._compare, null);
	    } else {
	      //Hard case: Repaint n, and then do some nasty stuff
	      //console.log("BLACK leaf no children")
	      for (var i = 0; i < cstack.length; ++i) {
	        cstack[i]._count--;
	      }
	      var parent = cstack[cstack.length - 2];
	      fixDoubleBlack(cstack);
	      //Fix up links
	      if (parent.left === n) {
	        parent.left = null;
	      } else {
	        parent.right = null;
	      }
	    }
	  }
	  return new RedBlackTree(this.tree._compare, cstack[0]);
	};

	//Returns key
	Object.defineProperty(iproto, "key", {
	  get: function () {
	    if (this._stack.length > 0) {
	      return this._stack[this._stack.length - 1].key;
	    }
	    return;
	  },
	  enumerable: true
	});

	//Returns value
	Object.defineProperty(iproto, "value", {
	  get: function () {
	    if (this._stack.length > 0) {
	      return this._stack[this._stack.length - 1].value;
	    }
	    return;
	  },
	  enumerable: true
	});

	//Returns the position of this iterator in the sorted list
	Object.defineProperty(iproto, "index", {
	  get: function () {
	    var idx = 0;
	    var stack = this._stack;
	    if (stack.length === 0) {
	      var r = this.tree.root;
	      if (r) {
	        return r._count;
	      }
	      return 0;
	    } else if (stack[stack.length - 1].left) {
	      idx = stack[stack.length - 1].left._count;
	    }
	    for (var s = stack.length - 2; s >= 0; --s) {
	      if (stack[s + 1] === stack[s].right) {
	        ++idx;
	        if (stack[s].left) {
	          idx += stack[s].left._count;
	        }
	      }
	    }
	    return idx;
	  },
	  enumerable: true
	});

	//Advances iterator to next element in list
	iproto.next = function () {
	  var stack = this._stack;
	  if (stack.length === 0) {
	    return;
	  }
	  var n = stack[stack.length - 1];
	  if (n.right) {
	    n = n.right;
	    while (n) {
	      stack.push(n);
	      n = n.left;
	    }
	  } else {
	    stack.pop();
	    while (stack.length > 0 && stack[stack.length - 1].right === n) {
	      n = stack[stack.length - 1];
	      stack.pop();
	    }
	  }
	};

	//Checks if iterator is at end of tree
	Object.defineProperty(iproto, "hasNext", {
	  get: function () {
	    var stack = this._stack;
	    if (stack.length === 0) {
	      return false;
	    }
	    if (stack[stack.length - 1].right) {
	      return true;
	    }
	    for (var s = stack.length - 1; s > 0; --s) {
	      if (stack[s - 1].left === stack[s]) {
	        return true;
	      }
	    }
	    return false;
	  }
	});

	//Update value
	iproto.update = function (value) {
	  var stack = this._stack;
	  if (stack.length === 0) {
	    throw new Error("Can't update empty node!");
	  }
	  var cstack = new Array(stack.length);
	  var n = stack[stack.length - 1];
	  cstack[cstack.length - 1] = new RBNode(n._color, n.key, value, n.left, n.right, n._count);
	  for (var i = stack.length - 2; i >= 0; --i) {
	    n = stack[i];
	    if (n.left === stack[i + 1]) {
	      cstack[i] = new RBNode(n._color, n.key, n.value, cstack[i + 1], n.right, n._count);
	    } else {
	      cstack[i] = new RBNode(n._color, n.key, n.value, n.left, cstack[i + 1], n._count);
	    }
	  }
	  return new RedBlackTree(this.tree._compare, cstack[0]);
	};

	//Moves iterator backward one element
	iproto.prev = function () {
	  var stack = this._stack;
	  if (stack.length === 0) {
	    return;
	  }
	  var n = stack[stack.length - 1];
	  if (n.left) {
	    n = n.left;
	    while (n) {
	      stack.push(n);
	      n = n.right;
	    }
	  } else {
	    stack.pop();
	    while (stack.length > 0 && stack[stack.length - 1].left === n) {
	      n = stack[stack.length - 1];
	      stack.pop();
	    }
	  }
	};

	//Checks if iterator is at start of tree
	Object.defineProperty(iproto, "hasPrev", {
	  get: function () {
	    var stack = this._stack;
	    if (stack.length === 0) {
	      return false;
	    }
	    if (stack[stack.length - 1].left) {
	      return true;
	    }
	    for (var s = stack.length - 1; s > 0; --s) {
	      if (stack[s - 1].right === stack[s]) {
	        return true;
	      }
	    }
	    return false;
	  }
	});

	//Default comparison function
	function defaultCompare(a, b) {
	  if (a < b) {
	    return -1;
	  }
	  if (a > b) {
	    return 1;
	  }
	  return 0;
	}

	//Build a tree
	function createRBTree(compare) {
	  return new RedBlackTree(compare || defaultCompare, null);
	}
	});

	var require$$2$2 = (rbtree && typeof rbtree === 'object' && 'default' in rbtree ? rbtree['default'] : rbtree);

	var slabs = __commonjs(function (module) {
	"use strict";

	module.exports = createSlabDecomposition;

	var bounds = require$$3;
	var createRBTree = require$$2$2;
	var orient = require$$0$1;
	var orderSegments = require$$0;

	function SlabDecomposition(slabs, coordinates, horizontal) {
	  this.slabs = slabs;
	  this.coordinates = coordinates;
	  this.horizontal = horizontal;
	}

	var proto = SlabDecomposition.prototype;

	function compareHorizontal(e, y) {
	  return e.y - y;
	}

	function searchBucket(root, p) {
	  var lastNode = null;
	  while (root) {
	    var seg = root.key;
	    var l, r;
	    if (seg[0][0] < seg[1][0]) {
	      l = seg[0];
	      r = seg[1];
	    } else {
	      l = seg[1];
	      r = seg[0];
	    }
	    var o = orient(l, r, p);
	    if (o < 0) {
	      root = root.left;
	    } else if (o > 0) {
	      if (p[0] !== seg[1][0]) {
	        lastNode = root;
	        root = root.right;
	      } else {
	        var val = searchBucket(root.right, p);
	        if (val) {
	          return val;
	        }
	        root = root.left;
	      }
	    } else {
	      if (p[0] !== seg[1][0]) {
	        return root;
	      } else {
	        var val = searchBucket(root.right, p);
	        if (val) {
	          return val;
	        }
	        root = root.left;
	      }
	    }
	  }
	  return lastNode;
	}

	proto.castUp = function (p) {
	  var bucket = bounds.le(this.coordinates, p[0]);
	  if (bucket < 0) {
	    return -1;
	  }
	  var root = this.slabs[bucket];
	  var hitNode = searchBucket(this.slabs[bucket], p);
	  var lastHit = -1;
	  if (hitNode) {
	    lastHit = hitNode.value;
	  }
	  //Edge case: need to handle horizontal segments (sucks)
	  if (this.coordinates[bucket] === p[0]) {
	    var lastSegment = null;
	    if (hitNode) {
	      lastSegment = hitNode.key;
	    }
	    if (bucket > 0) {
	      var otherHitNode = searchBucket(this.slabs[bucket - 1], p);
	      if (otherHitNode) {
	        if (lastSegment) {
	          if (orderSegments(otherHitNode.key, lastSegment) > 0) {
	            lastSegment = otherHitNode.key;
	            lastHit = otherHitNode.value;
	          }
	        } else {
	          lastHit = otherHitNode.value;
	          lastSegment = otherHitNode.key;
	        }
	      }
	    }
	    var horiz = this.horizontal[bucket];
	    if (horiz.length > 0) {
	      var hbucket = bounds.ge(horiz, p[1], compareHorizontal);
	      if (hbucket < horiz.length) {
	        var e = horiz[hbucket];
	        if (p[1] === e.y) {
	          if (e.closed) {
	            return e.index;
	          } else {
	            while (hbucket < horiz.length - 1 && horiz[hbucket + 1].y === p[1]) {
	              hbucket = hbucket + 1;
	              e = horiz[hbucket];
	              if (e.closed) {
	                return e.index;
	              }
	            }
	            if (e.y === p[1] && !e.start) {
	              hbucket = hbucket + 1;
	              if (hbucket >= horiz.length) {
	                return lastHit;
	              }
	              e = horiz[hbucket];
	            }
	          }
	        }
	        //Check if e is above/below last segment
	        if (e.start) {
	          if (lastSegment) {
	            var o = orient(lastSegment[0], lastSegment[1], [p[0], e.y]);
	            if (lastSegment[0][0] > lastSegment[1][0]) {
	              o = -o;
	            }
	            if (o > 0) {
	              lastHit = e.index;
	            }
	          } else {
	            lastHit = e.index;
	          }
	        } else if (e.y !== p[1]) {
	          lastHit = e.index;
	        }
	      }
	    }
	  }
	  return lastHit;
	};

	function IntervalSegment(y, index, start, closed) {
	  this.y = y;
	  this.index = index;
	  this.start = start;
	  this.closed = closed;
	}

	function Event(x, segment, create, index) {
	  this.x = x;
	  this.segment = segment;
	  this.create = create;
	  this.index = index;
	}

	function createSlabDecomposition(segments) {
	  var numSegments = segments.length;
	  var numEvents = 2 * numSegments;
	  var events = new Array(numEvents);
	  for (var i = 0; i < numSegments; ++i) {
	    var s = segments[i];
	    var f = s[0][0] < s[1][0];
	    events[2 * i] = new Event(s[0][0], s, f, i);
	    events[2 * i + 1] = new Event(s[1][0], s, !f, i);
	  }
	  events.sort(function (a, b) {
	    var d = a.x - b.x;
	    if (d) {
	      return d;
	    }
	    d = a.create - b.create;
	    if (d) {
	      return d;
	    }
	    return Math.min(a.segment[0][1], a.segment[1][1]) - Math.min(b.segment[0][1], b.segment[1][1]);
	  });
	  var tree = createRBTree(orderSegments);
	  var slabs = [];
	  var lines = [];
	  var horizontal = [];
	  var lastX = -Infinity;
	  for (var i = 0; i < numEvents;) {
	    var x = events[i].x;
	    var horiz = [];
	    while (i < numEvents) {
	      var e = events[i];
	      if (e.x !== x) {
	        break;
	      }
	      i += 1;
	      if (e.segment[0][0] === e.x && e.segment[1][0] === e.x) {
	        if (e.create) {
	          if (e.segment[0][1] < e.segment[1][1]) {
	            horiz.push(new IntervalSegment(e.segment[0][1], e.index, true, true));
	            horiz.push(new IntervalSegment(e.segment[1][1], e.index, false, false));
	          } else {
	            horiz.push(new IntervalSegment(e.segment[1][1], e.index, true, false));
	            horiz.push(new IntervalSegment(e.segment[0][1], e.index, false, true));
	          }
	        }
	      } else {
	        if (e.create) {
	          tree = tree.insert(e.segment, e.index);
	        } else {
	          tree = tree.remove(e.segment);
	        }
	      }
	    }
	    slabs.push(tree.root);
	    lines.push(x);
	    horizontal.push(horiz);
	  }
	  return new SlabDecomposition(slabs, lines, horizontal);
	}
	});

	var require$$2 = (slabs && typeof slabs === 'object' && 'default' in slabs ? slabs['default'] : slabs);

	var pnpBig = __commonjs(function (module) {
	module.exports = preprocessPolygon;

	var orient = require$$0$1[3];
	var makeSlabs = require$$2;
	var makeIntervalTree = require$$1;
	var bsearch = require$$3;

	function visitInterval() {
	  return true;
	}

	function intervalSearch(table) {
	  return function (x, y) {
	    var tree = table[x];
	    if (tree) {
	      return !!tree.queryPoint(y, visitInterval);
	    }
	    return false;
	  };
	}

	function buildVerticalIndex(segments) {
	  var table = {};
	  for (var i = 0; i < segments.length; ++i) {
	    var s = segments[i];
	    var x = s[0][0];
	    var y0 = s[0][1];
	    var y1 = s[1][1];
	    var p = [Math.min(y0, y1), Math.max(y0, y1)];
	    if (x in table) {
	      table[x].push(p);
	    } else {
	      table[x] = [p];
	    }
	  }
	  var intervalTable = {};
	  var keys = Object.keys(table);
	  for (var i = 0; i < keys.length; ++i) {
	    var segs = table[keys[i]];
	    intervalTable[keys[i]] = makeIntervalTree(segs);
	  }
	  return intervalSearch(intervalTable);
	}

	function buildSlabSearch(slabs, coordinates) {
	  return function (p) {
	    var bucket = bsearch.le(coordinates, p[0]);
	    if (bucket < 0) {
	      return 1;
	    }
	    var root = slabs[bucket];
	    if (!root) {
	      if (bucket > 0 && coordinates[bucket] === p[0]) {
	        root = slabs[bucket - 1];
	      } else {
	        return 1;
	      }
	    }
	    var lastOrientation = 1;
	    while (root) {
	      var s = root.key;
	      var o = orient(p, s[0], s[1]);
	      if (s[0][0] < s[1][0]) {
	        if (o < 0) {
	          root = root.left;
	        } else if (o > 0) {
	          lastOrientation = -1;
	          root = root.right;
	        } else {
	          return 0;
	        }
	      } else {
	        if (o > 0) {
	          root = root.left;
	        } else if (o < 0) {
	          lastOrientation = 1;
	          root = root.right;
	        } else {
	          return 0;
	        }
	      }
	    }
	    return lastOrientation;
	  };
	}

	function classifyEmpty(p) {
	  return 1;
	}

	function createClassifyVertical(testVertical) {
	  return function classify(p) {
	    if (testVertical(p[0], p[1])) {
	      return 0;
	    }
	    return 1;
	  };
	}

	function createClassifyPointDegen(testVertical, testNormal) {
	  return function classify(p) {
	    if (testVertical(p[0], p[1])) {
	      return 0;
	    }
	    return testNormal(p);
	  };
	}

	function preprocessPolygon(loops) {
	  //Compute number of loops
	  var numLoops = loops.length;

	  //Unpack segments
	  var segments = [];
	  var vsegments = [];
	  var ptr = 0;
	  for (var i = 0; i < numLoops; ++i) {
	    var loop = loops[i];
	    var numVertices = loop.length;
	    for (var s = numVertices - 1, t = 0; t < numVertices; s = t++) {
	      var a = loop[s];
	      var b = loop[t];
	      if (a[0] === b[0]) {
	        vsegments.push([a, b]);
	      } else {
	        segments.push([a, b]);
	      }
	    }
	  }

	  //Degenerate case: All loops are empty
	  if (segments.length === 0) {
	    if (vsegments.length === 0) {
	      return classifyEmpty;
	    } else {
	      return createClassifyVertical(buildVerticalIndex(vsegments));
	    }
	  }

	  //Build slab decomposition
	  var slabs = makeSlabs(segments);
	  var testSlab = buildSlabSearch(slabs.slabs, slabs.coordinates);

	  if (vsegments.length === 0) {
	    return testSlab;
	  } else {
	    return createClassifyPointDegen(buildVerticalIndex(vsegments), testSlab);
	  }
	}
	});

	var pibp = (pnpBig && typeof pnpBig === 'object' && 'default' in pnpBig ? pnpBig['default'] : pnpBig);

	// Serialized point

	var SerializedPoint = function () {
	  function SerializedPoint(input) {
	    return Array.isArray(input) && input.length >= 2 && typeof input[0] === 'number' && typeof input[1] === 'number';
	  }

	  ;
	  Object.defineProperty(SerializedPoint, Symbol.hasInstance, {
	    value: function (input) {
	      return SerializedPoint(input);
	    }
	  });
	  return SerializedPoint;
	}();

	// Serialized points


	var SerializedPoints = function () {
	  function SerializedPoints(input) {
	    return Array.isArray(input) && input.every(function (item) {
	      return SerializedPoint(item);
	    });
	  }

	  ;
	  Object.defineProperty(SerializedPoints, Symbol.hasInstance, {
	    value: function (input) {
	      return SerializedPoints(input);
	    }
	  });
	  return SerializedPoints;
	}();

	// Serialized SimplePolygon type


	var SerializedSimplePolygon = function () {
	  function SerializedSimplePolygon(input) {
	    return SerializedPoints(input);
	  }

	  ;
	  Object.defineProperty(SerializedSimplePolygon, Symbol.hasInstance, {
	    value: function (input) {
	      return SerializedSimplePolygon(input);
	    }
	  });
	  return SerializedSimplePolygon;
	}();

	// Serialized polygon


	var SerializedPolygon = function () {
	  function SerializedPolygon(input) {
	    return input != null && SerializedSimplePolygon(input.bounds) && Array.isArray(input.holes) && input.holes.every(function (item) {
	      return SerializedSimplePolygon(item);
	    });
	  }

	  ;
	  Object.defineProperty(SerializedPolygon, Symbol.hasInstance, {
	    value: function (input) {
	      return SerializedPolygon(input);
	    }
	  });
	  return SerializedPolygon;
	}();

	var Vec2 = function () {
	  function Vec2(x, y) {
	    babelHelpers.classCallCheck(this, Vec2);

	    if (!(typeof x === 'number')) {
	      throw new TypeError('Value of argument "x" violates contract.\n\nExpected:\nnumber\n\nGot:\n' + _inspect$2(x));
	    }

	    if (!(typeof y === 'number')) {
	      throw new TypeError('Value of argument "y" violates contract.\n\nExpected:\nnumber\n\nGot:\n' + _inspect$2(y));
	    }

	    this.x = x;
	    this.y = y;
	  }

	  Vec2.prototype.arr = function arr() {
	    function _ref(_id) {
	      if (!(Array.isArray(_id) && _id.every(function (item) {
	        return typeof item === 'number';
	      }))) {
	        throw new TypeError('Function return value violates contract.\n\nExpected:\nnumber[]\n\nGot:\n' + _inspect$2(_id));
	      }

	      return _id;
	    }

	    return _ref([this.x, this.y]);
	  };

	  Vec2.prototype.distSq = function distSq(v) {
	    function _ref2(_id2) {
	      if (!(typeof _id2 === 'number')) {
	        throw new TypeError('Function return value violates contract.\n\nExpected:\nnumber\n\nGot:\n' + _inspect$2(_id2));
	      }

	      return _id2;
	    }

	    if (!(v instanceof Vec2)) {
	      throw new TypeError('Value of argument "v" violates contract.\n\nExpected:\nVec2\n\nGot:\n' + _inspect$2(v));
	    }

	    var dx = v.x - this.x;
	    var dy = v.y - this.y;
	    return _ref2(dx * dx + dy * dy);
	  };

	  Vec2.prototype.dist = function dist(v) {
	    function _ref3(_id3) {
	      if (!(typeof _id3 === 'number')) {
	        throw new TypeError('Function return value violates contract.\n\nExpected:\nnumber\n\nGot:\n' + _inspect$2(_id3));
	      }

	      return _id3;
	    }

	    if (!(v instanceof Vec2)) {
	      throw new TypeError('Value of argument "v" violates contract.\n\nExpected:\nVec2\n\nGot:\n' + _inspect$2(v));
	    }

	    return _ref3(Math.sqrt(this.distSq(v)));
	  };

	  Vec2.prototype.len = function len() {
	    function _ref4(_id4) {
	      if (!(typeof _id4 === 'number')) {
	        throw new TypeError('Function return value violates contract.\n\nExpected:\nnumber\n\nGot:\n' + _inspect$2(_id4));
	      }

	      return _id4;
	    }

	    return _ref4(this.dist(Vec2.ORIGO));
	  };

	  Vec2.prototype.norm = function norm() {
	    var l = this.len();
	    return new Vec2(this.x / l, this.y / l);
	  };

	  Vec2.prototype.dot = function dot(v) {
	    function _ref6(_id6) {
	      if (!(typeof _id6 === 'number')) {
	        throw new TypeError('Function return value violates contract.\n\nExpected:\nnumber\n\nGot:\n' + _inspect$2(_id6));
	      }

	      return _id6;
	    }

	    if (!(v instanceof Vec2)) {
	      throw new TypeError('Value of argument "v" violates contract.\n\nExpected:\nVec2\n\nGot:\n' + _inspect$2(v));
	    }

	    return _ref6(this.x * v.x + this.y * v.y);
	  };

	  Vec2.prototype.scale = function scale(m) {
	    if (!(typeof m === 'number')) {
	      throw new TypeError('Value of argument "m" violates contract.\n\nExpected:\nnumber\n\nGot:\n' + _inspect$2(m));
	    }

	    return new Vec2(this.x * m, this.y * m);
	  };

	  Vec2.prototype.add = function add(v) {
	    if (!(v instanceof Vec2)) {
	      throw new TypeError('Value of argument "v" violates contract.\n\nExpected:\nVec2\n\nGot:\n' + _inspect$2(v));
	    }

	    return new Vec2(this.x + v.x, this.y + v.y);
	  };

	  Vec2.prototype.sub = function sub(v) {
	    function _ref9(_id9) {
	      if (!(_id9 instanceof Vec2)) {
	        throw new TypeError('Function return value violates contract.\n\nExpected:\nVec2\n\nGot:\n' + _inspect$2(_id9));
	      }

	      return _id9;
	    }

	    if (!(v instanceof Vec2)) {
	      throw new TypeError('Value of argument "v" violates contract.\n\nExpected:\nVec2\n\nGot:\n' + _inspect$2(v));
	    }

	    return _ref9(this.add(v.scale(-1)));
	  };

	  Vec2.prototype.equals = function equals(o) {
	    return this === o || this.x === o.x && this.y === o.y;
	  };

	  Vec2.fromArray = function fromArray(p) {
	    if (!(Array.isArray(p) && p.every(function (item) {
	      return typeof item === 'number';
	    }))) {
	      throw new TypeError('Value of argument "p" violates contract.\n\nExpected:\nnumber[]\n\nGot:\n' + _inspect$2(p));
	    }

	    return new Vec2(p[0], p[1]);
	  };

	  return Vec2;
	}();

	// line ina twod space
	Vec2.ORIGO = new Vec2(0, 0);
	Vec2.INF = new Vec2(Infinity, Infinity);
	var Line2 = function () {
	  function Line2(a, b) {
	    babelHelpers.classCallCheck(this, Line2);

	    this.a = a;

	    if (!(this.a instanceof Vec2)) {
	      throw new TypeError('Value of "this.a" violates contract.\n\nExpected:\nVec2\n\nGot:\n' + _inspect$2(this.a));
	    }

	    this.b = b;

	    if (!(this.b instanceof Vec2)) {
	      throw new TypeError('Value of "this.b" violates contract.\n\nExpected:\nVec2\n\nGot:\n' + _inspect$2(this.b));
	    }
	  }

	  Line2.prototype.equals = function equals(o) {
	    return this === o || this.a.equals(o.a) && this.b.equals(o.b);
	  };

	  /**
	   * gets a point in the center of the line
	   * floating point errors will of course occurs
	   */


	  Line2.prototype.centerPoint = function centerPoint() {
	    function _ref13(_id13) {
	      if (!(_id13 instanceof Vec2)) {
	        throw new TypeError('Function return value violates contract.\n\nExpected:\nVec2\n\nGot:\n' + _inspect$2(_id13));
	      }

	      return _id13;
	    }

	    return _ref13(this.a.add(this.b).scale(0.5));
	  };

	  Line2.prototype.dir = function dir() {
	    function _ref14(_id14) {
	      if (!(_id14 instanceof Vec2)) {
	        throw new TypeError('Function return value violates contract.\n\nExpected:\nVec2\n\nGot:\n' + _inspect$2(_id14));
	      }

	      return _id14;
	    }

	    return _ref14(this.b.sub(this.a).norm());
	  };

	  Line2.prototype.len = function len() {
	    function _ref15(_id15) {
	      if (!(typeof _id15 === 'number')) {
	        throw new TypeError('Function return value violates contract.\n\nExpected:\nnumber\n\nGot:\n' + _inspect$2(_id15));
	      }

	      return _id15;
	    }

	    return _ref15(this.a.dist(this.b));
	  };

	  Line2.prototype.intersects = function intersects(l2) {
	    if (!(l2 instanceof Line2)) {
	      throw new TypeError('Value of argument "l2" violates contract.\n\nExpected:\nLine2\n\nGot:\n' + _inspect$2(l2));
	    }

	    var s1x = this.b.x - this.a.x;
	    var s1y = this.b.y - this.a.y;
	    var s2x = l2.b.x - l2.a.x;
	    var s2y = l2.b.y - l2.a.y;

	    var s = (-s1y * (this.a.x - l2.a.x) + s1x * (this.a.y - l2.a.y)) / (-s2x * s1y + s1x * s2y);
	    var t = (s2x * (this.a.y - l2.a.y) - s2y * (this.a.x - l2.a.x)) / (-s2x * s1y + s1x * s2y);

	    var eps = 0.00001;
	    return 0 < s - eps && s + eps < 1 && 0 < t - eps && t + eps < 1;
	  };

	  // Point on this line closest to x


	  Line2.prototype.closestTo = function closestTo(x) {
	    function _ref17(_id17) {
	      if (!(_id17 instanceof Vec2)) {
	        throw new TypeError('Function return value violates contract.\n\nExpected:\nVec2\n\nGot:\n' + _inspect$2(_id17));
	      }

	      return _id17;
	    }

	    if (!(x instanceof Vec2)) {
	      throw new TypeError('Value of argument "x" violates contract.\n\nExpected:\nVec2\n\nGot:\n' + _inspect$2(x));
	    }

	    var v = this.dir();
	    var s = x.dot(v) / v.dot(v);
	    var l = this.len();

	    if (s >= this.len()) {
	      return this.b;
	    }

	    if (s <= 0) {
	      return this.a;
	    }

	    return _ref17(v.scale(x.dot(v) / v.dot(v)).add(this.a));
	  };

	  Line2.fromArray = function fromArray(a, b) {
	    return new Line2(Vec2.fromArray(a), Vec2.fromArray(b));
	  };

	  return Line2;
	}();

	// Basic polygon without holes and that madness
	var SimplePolygon = function () {
	  function SimplePolygon(points) {
	    babelHelpers.classCallCheck(this, SimplePolygon);

	    this.points = points;

	    if (!(Array.isArray(this.points) && this.points.every(function (item) {
	      return item instanceof Vec2;
	    }))) {
	      throw new TypeError('Value of "this.points" violates contract.\n\nExpected:\nVec2[]\n\nGot:\n' + _inspect$2(this.points));
	    }
	  }

	  SimplePolygon.prototype.serialize = function serialize() {
	    function _ref18(_id18) {
	      if (!SerializedSimplePolygon(_id18)) {
	        throw new TypeError('Function return value violates contract.\n\nExpected:\nSerializedSimplePolygon\n\nGot:\n' + _inspect$2(_id18));
	      }

	      return _id18;
	    }

	    return _ref18(this.points.map(function (vec) {
	      return vec.arr();
	    }));
	  };

	  SimplePolygon.prototype.isClockwise = function isClockwise() {
	    return this.area() > 0;
	  };

	  SimplePolygon.prototype.area = function area() {
	    function _ref20(_id20) {
	      if (!(typeof _id20 === 'number')) {
	        throw new TypeError('Function return value violates contract.\n\nExpected:\nnumber\n\nGot:\n' + _inspect$2(_id20));
	      }

	      return _id20;
	    }

	    var area = 0;
	    var first = this.points[0];
	    for (var i = 2; i < this.points.length; i++) {
	      var p = this.points[i - 1];
	      var c = this.points[i];
	      var e0 = first.sub(p);
	      var e1 = first.sub(c);
	      area += e0.x * e1.y - e0.y * e1.x;
	    }
	    return _ref20(area / 2);
	  };

	  SimplePolygon.prototype.sides = function sides() {
	    function _ref21(_id21) {
	      if (!(Array.isArray(_id21) && _id21.every(function (item) {
	        return item instanceof Line2;
	      }))) {
	        throw new TypeError('Function return value violates contract.\n\nExpected:\nLine2[]\n\nGot:\n' + _inspect$2(_id21));
	      }

	      return _id21;
	    }

	    return _ref21(this.points.map(function (p1, i, ps) {
	      return new Line2(p1, ps[(i + 1) % ps.length]);
	    }));
	  };

	  SimplePolygon.prototype.intersectsLine = function intersectsLine(line) {
	    function _ref22(_id22) {
	      if (!(typeof _id22 === 'boolean')) {
	        throw new TypeError('Function return value violates contract.\n\nExpected:\nbool\n\nGot:\n' + _inspect$2(_id22));
	      }

	      return _id22;
	    }

	    if (!(line instanceof Line2)) {
	      throw new TypeError('Value of argument "line" violates contract.\n\nExpected:\nLine2\n\nGot:\n' + _inspect$2(line));
	    }

	    return _ref22(this.sides().some(function (l) {
	      return l.intersects(line);
	    }));
	  };

	  SimplePolygon.prototype.intersectsPoly = function intersectsPoly(poly) {
	    var _this = this;

	    if (!(poly instanceof SimplePolygon)) {
	      throw new TypeError('Value of argument "poly" violates contract.\n\nExpected:\nSimplePolygon\n\nGot:\n' + _inspect$2(poly));
	    }

	    return poly.sides().some(function (line) {
	      return _this.intersectsLine(line);
	    });
	  };

	  SimplePolygon.prototype.contains = function contains(test) {
	    var EPS = arguments.length <= 1 || arguments[1] === undefined ? 0.1 : arguments[1];

	    if (!(test instanceof Vec2)) {
	      throw new TypeError('Value of argument "test" violates contract.\n\nExpected:\nVec2\n\nGot:\n' + _inspect$2(test));
	    }

	    if (!(typeof EPS === 'number')) {
	      throw new TypeError('Value of argument "EPS" violates contract.\n\nExpected:\nnumber\n\nGot:\n' + _inspect$2(EPS));
	    }

	    // picked up at http://gamedev.stackexchange.com/questions/31741/adding-tolerance-to-a-point-in-polygon-test
	    var oldPoint = this.points[this.points.length - 1];
	    var oldSqDist = oldPoint.distSq(test);
	    var inside = false;

	    var left = null;
	    var right = null;

	    for (var i = 0; i < this.points.length; i++) {
	      var newPoint = this.points[i];
	      var newSqDist = newPoint.distSq(test);

	      if (oldSqDist + newSqDist + 2 * Math.sqrt(oldSqDist * newSqDist) - newPoint.distSq(oldPoint) < EPS) {
	        return true;
	      }

	      if (newPoint.x > oldPoint.x) {
	        left = oldPoint;
	        right = newPoint;
	      } else {
	        left = newPoint;
	        right = oldPoint;
	      }

	      if (newPoint.x < test.x == test.x <= oldPoint.x && (test.y - left.y) * (right.x - left.x) < (right.y - left.y) * (test.x - left.x)) {
	        inside = !inside;
	      }

	      oldPoint = newPoint;
	      oldSqDist = newSqDist;
	    }

	    // no need to check points ???? epsilon shougld do
	    return inside || this.points.some(function (p) {
	      return p.equals(test);
	    });
	  };

	  SimplePolygon.prototype.nearestEdgePoint = function nearestEdgePoint(point) {
	    function _ref24(_id24) {
	      if (!(_id24 instanceof Vec2)) {
	        throw new TypeError('Function return value violates contract.\n\nExpected:\nVec2\n\nGot:\n' + _inspect$2(_id24));
	      }

	      return _id24;
	    }

	    if (!(point instanceof Vec2)) {
	      throw new TypeError('Value of argument "point" violates contract.\n\nExpected:\nVec2\n\nGot:\n' + _inspect$2(point));
	    }

	    var nearest = Vec2.INF;
	    this.points.forEach(function (p1, i, ps) {
	      var p2 = ps[(i + 1) % ps.length];
	      var near = new Line2(p1, p2).closestTo(point.sub(p1));
	      if (near.dist(point) < nearest.dist(point)) {
	        nearest = near;
	      }
	    });
	    return _ref24(nearest);
	  };

	  SimplePolygon.fromSerialized = function fromSerialized(bounds) {
	    if (!SerializedSimplePolygon(bounds)) {
	      throw new TypeError('Value of argument "bounds" violates contract.\n\nExpected:\nSerializedSimplePolygon\n\nGot:\n' + _inspect$2(bounds));
	    }

	    return new SimplePolygon(bounds.map(Vec2.fromArray));
	  };

	  return SimplePolygon;
	}();

	// Extended polygon that supports holes
	var Polygon = function () {
	  function Polygon(bounds) {
	    babelHelpers.classCallCheck(this, Polygon);

	    // Bounds should be counter clockwise
	    if (bounds.isClockwise()) {
	      console.warn('got clockwise bounds, rewinding to anti-clockwise');
	      bounds.points.reverse();
	    }
	    this.bounds = bounds;

	    // Holes should be clockwise.

	    if (!(this.bounds instanceof SimplePolygon)) {
	      throw new TypeError('Value of "this.bounds" violates contract.\n\nExpected:\nSimplePolygon\n\nGot:\n' + _inspect$2(this.bounds));
	    }

	    this.interior = []; // holes

	    this.updateClassifier();
	  }

	  Polygon.prototype.updateClassifier = function updateClassifier() {
	    var _serialize = this.serialize();

	    var bounds = _serialize.bounds;
	    var holes = _serialize.holes;

	    this.classifyPoint = pibp([bounds].concat(holes || []));
	  };

	  Polygon.prototype.serialize = function serialize() {
	    function _ref26(_id26) {
	      if (!SerializedPolygon(_id26)) {
	        throw new TypeError('Function return value violates contract.\n\nExpected:\nSerializedPolygon\n\nGot:\n' + _inspect$2(_id26));
	      }

	      return _id26;
	    }

	    return _ref26({
	      bounds: this.bounds.serialize(),
	      holes: this.interior.map(function (hole) {
	        return hole.serialize();
	      })
	    });
	  };

	  Polygon.prototype.addHole = function addHole(polygon) {
	    if (!(polygon instanceof SimplePolygon)) {
	      throw new TypeError('Value of argument "polygon" violates contract.\n\nExpected:\nSimplePolygon\n\nGot:\n' + _inspect$2(polygon));
	    }

	    if (polygon.points.length < 2) {
	      throw Error('Not a polygon');
	    }
	    if (!this.containsPolygon(polygon)) {
	      throw Error('Trying to add interior polygon that is not contained in this');
	    }
	    if (!polygon.isClockwise()) {
	      console.warn('got anti-clockwise hole, rewinding to clockwise');
	      polygon.points.reverse();
	    }

	    this.interior = this.interior.concat(polygon);

	    this.updateClassifier();
	  };

	  Polygon.prototype.containsPolygon = function containsPolygon(poly) {
	    if (!(poly instanceof SimplePolygon)) {
	      throw new TypeError('Value of argument "poly" violates contract.\n\nExpected:\nSimplePolygon\n\nGot:\n' + _inspect$2(poly));
	    }

	    // this polygon contains `poly` when no bound side intersects with this and
	    // one of `poly`s vertices are interior of this
	    return this.contains(poly.points[0]) && !this.intersectsPoly(poly);
	  };

	  Polygon.prototype.intersectsLine = function intersectsLine(line) {
	    function _ref29(_id29) {
	      if (!(typeof _id29 === 'boolean')) {
	        throw new TypeError('Function return value violates contract.\n\nExpected:\nbool\n\nGot:\n' + _inspect$2(_id29));
	      }

	      return _id29;
	    }

	    if (!(line instanceof Line2)) {
	      throw new TypeError('Value of argument "line" violates contract.\n\nExpected:\nLine2\n\nGot:\n' + _inspect$2(line));
	    }

	    return _ref29(this.bounds.intersectsLine(line) || this.interior.some(function (hole) {
	      return hole.intersectsLine(line);
	    }));
	  };

	  Polygon.prototype.intersectsPoly = function intersectsPoly(poly) {
	    function _ref30(_id30) {
	      if (!(typeof _id30 === 'boolean')) {
	        throw new TypeError('Function return value violates contract.\n\nExpected:\nbool\n\nGot:\n' + _inspect$2(_id30));
	      }

	      return _id30;
	    }

	    if (!(poly instanceof SimplePolygon)) {
	      throw new TypeError('Value of argument "poly" violates contract.\n\nExpected:\nSimplePolygon\n\nGot:\n' + _inspect$2(poly));
	    }

	    return _ref30(this.bounds.intersectsPoly(poly) || this.interior.some(function (hole) {
	      return hole.intersectsPoly(poly);
	    }));
	  };

	  Polygon.prototype.containsPIBP = function containsPIBP(test) {
	    function _ref31(_id31) {
	      if (!(typeof _id31 === 'number')) {
	        throw new TypeError('Function return value violates contract.\n\nExpected:\nnumber\n\nGot:\n' + _inspect$2(_id31));
	      }

	      return _id31;
	    }

	    return _ref31(this.classifyPoint(test.arr()));
	  };

	  Polygon.prototype.contains = function contains(test) {
	    if (!(test instanceof Vec2)) {
	      throw new TypeError('Value of argument "test" violates contract.\n\nExpected:\nVec2\n\nGot:\n' + _inspect$2(test));
	    }

	    return this.containsPIBP(test) <= 0;
	  };

	  // Gives the nearest point to `point` that is on the edge of the shape


	  Polygon.prototype.nearestEdgePoint = function nearestEdgePoint(point) {
	    function _ref33(_id33) {
	      if (!(_id33 instanceof Vec2)) {
	        throw new TypeError('Function return value violates contract.\n\nExpected:\nVec2\n\nGot:\n' + _inspect$2(_id33));
	      }

	      return _id33;
	    }

	    if (!(point instanceof Vec2)) {
	      throw new TypeError('Value of argument "point" violates contract.\n\nExpected:\nVec2\n\nGot:\n' + _inspect$2(point));
	    }

	    var nearest = this.bounds.nearestEdgePoint(point);

	    var hole = this.interior.find(function (hole) {
	      return hole.contains(point);
	    });
	    if (hole) {
	      var near = hole.nearestEdgePoint(point);
	      if (near.dist(point) < nearest.dist(point)) {
	        nearest = near;
	      }
	    }
	    if (this.containsPIBP(nearest) > 0) {
	      console.warn('edge point is not inside quick to fix..');
	      return _ref33(this.nearestEdgePoint(point.add(new Vec2(.01, .01))));
	    }
	    return _ref33(nearest);
	  };

	  Polygon.prototype.nearestInside = function nearestInside(point) {
	    function _ref34(_id34) {
	      if (!(_id34 instanceof Vec2)) {
	        throw new TypeError('Function return value violates contract.\n\nExpected:\nVec2\n\nGot:\n' + _inspect$2(_id34));
	      }

	      return _id34;
	    }

	    if (!(point instanceof Vec2)) {
	      throw new TypeError('Value of argument "point" violates contract.\n\nExpected:\nVec2\n\nGot:\n' + _inspect$2(point));
	    }

	    if (this.contains(point)) {
	      return point;
	    }

	    return _ref34(this.nearestEdgePoint(point));
	  };

	  Polygon.fromSerialized = function fromSerialized(_ref36) {
	    var bounds = _ref36.bounds;
	    var holes = _ref36.holes;

	    if (!SerializedPolygon(arguments[0])) {
	      throw new TypeError('Value of argument 0 violates contract.\n\nExpected:\nSerializedPolygon\n\nGot:\n' + _inspect$2(arguments[0]));
	    }

	    var instance = new Polygon(SimplePolygon.fromSerialized(bounds));

	    holes
	    // deserialize every hole
	    .map(SimplePolygon.fromSerialized)
	    // add hole. Maybe constructor should take holes..
	    .forEach(instance.addHole.bind(instance));

	    return instance;
	  };

	  return Polygon;
	}();

	function _inspect$2(input, depth) {
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

	        var first = _inspect$2(input[0], depth);

	        if (input.every(function (item) {
	          return _inspect$2(item, depth) === first;
	        })) {
	          return {
	            v: first.trim() + '[]'
	          };
	        } else {
	          return {
	            v: '[' + input.slice(0, maxKeys).map(function (item) {
	              return _inspect$2(item, depth);
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
	      return (/^([A-Z_$][A-Z0-9_$]*)$/i.test(key) ? key : JSON.stringify(key)) + ': ' + _inspect$2(input[key], depth) + ';';
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

var algebra = Object.freeze({
	  Vec2: Vec2,
	  Line2: Line2,
	  SimplePolygon: SimplePolygon,
	  Polygon: Polygon
	});

	function astar(start, end) {
	  function _ref(_id) {
	    if (!(Array.isArray(_id) && _id.every(function (item) {
	      return item instanceof Node;
	    }))) {
	      throw new TypeError('Function "astar" return value violates contract.\n\nExpected:\nNode[]\n\nGot:\n' + _inspect$3(_id));
	    }

	    return _id;
	  }

	  if (!(start instanceof Node)) {
	    throw new TypeError('Value of argument "start" violates contract.\n\nExpected:\nNode\n\nGot:\n' + _inspect$3(start));
	  }

	  if (!(end instanceof Node)) {
	    throw new TypeError('Value of argument "end" violates contract.\n\nExpected:\nNode\n\nGot:\n' + _inspect$3(end));
	  }

	  var heuristic = function (a, b) {
	    function _ref2(_id2) {
	      if (!(typeof _id2 === 'number')) {
	        throw new TypeError('Function return value violates contract.\n\nExpected:\nnumber\n\nGot:\n' + _inspect$3(_id2));
	      }

	      return _id2;
	    }

	    if (!(a instanceof Node)) {
	      throw new TypeError('Value of argument "a" violates contract.\n\nExpected:\nNode\n\nGot:\n' + _inspect$3(a));
	    }

	    if (!(b instanceof Node)) {
	      throw new TypeError('Value of argument "b" violates contract.\n\nExpected:\nNode\n\nGot:\n' + _inspect$3(b));
	    }

	    return _ref2(a.pos.dist(b.pos));
	  };

	  var closedSet = [];

	  if (!(Array.isArray(closedSet) && closedSet.every(function (item) {
	    return item instanceof Node;
	  }))) {
	    throw new TypeError('Value of variable "closedSet" violates contract.\n\nExpected:\nNode[]\n\nGot:\n' + _inspect$3(closedSet));
	  }

	  var openSet = [start];

	  if (!(Array.isArray(openSet) && openSet.every(function (item) {
	    return item instanceof Node;
	  }))) {
	    throw new TypeError('Value of variable "openSet" violates contract.\n\nExpected:\nNode[]\n\nGot:\n' + _inspect$3(openSet));
	  }

	  var cameFrom = new Map();

	  // Lowest known cost to key

	  if (!(cameFrom instanceof Map)) {
	    throw new TypeError('Value of variable "cameFrom" violates contract.\n\nExpected:\nMap<Node, number>\n\nGot:\n' + _inspect$3(cameFrom));
	  }

	  var gScore = new Map([[start, 0]]);

	  // Estimated total cost to end from key

	  if (!(gScore instanceof Map)) {
	    throw new TypeError('Value of variable "gScore" violates contract.\n\nExpected:\nMap<Node, number>\n\nGot:\n' + _inspect$3(gScore));
	  }

	  var fScore = new Map([[start, heuristic(start, end)]]);

	  //Default to Infinity for undefined keys

	  if (!(fScore instanceof Map)) {
	    throw new TypeError('Value of variable "fScore" violates contract.\n\nExpected:\nMap<Node, number>\n\nGot:\n' + _inspect$3(fScore));
	  }

	  gScore.get = function (key) {
	    if (!(key instanceof Node)) {
	      throw new TypeError('Value of argument "key" violates contract.\n\nExpected:\nNode\n\nGot:\n' + _inspect$3(key));
	    }

	    return gScore.has(key) ? Map.prototype.get.call(gScore, key) : Infinity;
	  };

	  fScore.get = function (key) {
	    if (!(key instanceof Node)) {
	      throw new TypeError('Value of argument "key" violates contract.\n\nExpected:\nNode\n\nGot:\n' + _inspect$3(key));
	    }

	    return fScore.has(key) ? Map.prototype.get.call(fScore, key) : Infinity;
	  };

	  var _loop = function () {
	    // Order by estimate distance
	    var current = openSet.sort(function (n1, n2) {
	      var a = fScore.get(n1);
	      var b = fScore.get(n2);
	      return a > b ? 1 : a < b ? -1 : 0;
	    }).shift();

	    if (current === end) {
	      var t = end;
	      var path = [t];
	      while (cameFrom.has(t)) {
	        t = cameFrom.get(t);
	        path.unshift(t);
	      }
	      return {
	        v: _ref(path)
	      };
	    }
	    closedSet = closedSet.concat(current);

	    if (!(Array.isArray(closedSet) && closedSet.every(function (item) {
	      return item instanceof Node;
	    }))) {
	      throw new TypeError('Value of variable "closedSet" violates contract.\n\nExpected:\nNode[]\n\nGot:\n' + _inspect$3(closedSet));
	    }

	    current.neighbours
	    // Neighbour must not already be visited
	    .filter(function (e) {
	      return ! ~closedSet.indexOf(e.to);
	    }).forEach(function (e) {
	      var tgscore = gScore.get(current) + e.weight;
	      if (! ~openSet.indexOf(e.to)) {
	        openSet = openSet.concat(e.to);

	        if (!(Array.isArray(openSet) && openSet.every(function (item) {
	          return item instanceof Node;
	        }))) {
	          throw new TypeError('Value of variable "openSet" violates contract.\n\nExpected:\nNode[]\n\nGot:\n' + _inspect$3(openSet));
	        }
	      } else if (tgscore >= gScore.get(e.to)) {
	        return;
	      }
	      cameFrom.set(e.to, current);
	      gScore.set(e.to, tgscore);
	      fScore.set(e.to, tgscore + heuristic(e.to, end));
	    });
	  };

	  while (openSet.length > 0) {
	    var _ret = _loop();

	    if (typeof _ret === "object") return _ret.v;
	  }

	  // no shortest path :(
	  return _ref([]);
	}

	var Node = function () {
	  function Node(pos) {
	    babelHelpers.classCallCheck(this, Node);

	    this.pos = pos;

	    if (!(this.pos instanceof Vec2)) {
	      throw new TypeError('Value of "this.pos" violates contract.\n\nExpected:\nVec2\n\nGot:\n' + _inspect$3(this.pos));
	    }

	    this.neighbours = [];

	    if (!(Array.isArray(this.neighbours) && this.neighbours.every(function (item) {
	      return item instanceof Edge;
	    }))) {
	      throw new TypeError('Value of "this.neighbours" violates contract.\n\nExpected:\nEdge[]\n\nGot:\n' + _inspect$3(this.neighbours));
	    }
	  }

	  Node.prototype.link = function link(other) {
	    this.neighbours = this.neighbours.concat(new Edge(this, other));

	    if (!(Array.isArray(this.neighbours) && this.neighbours.every(function (item) {
	      return item instanceof Edge;
	    }))) {
	      throw new TypeError('Value of "this.neighbours" violates contract.\n\nExpected:\nEdge[]\n\nGot:\n' + _inspect$3(this.neighbours));
	    }
	  };

	  Node.prototype.unlink = function unlink() {
	    var _this = this;

	    this.neighbours.forEach(function (_ref11) {
	      var to = _ref11.to;

	      to.neighbours = to.neighbours.filter(function (_ref12) {
	        var other = _ref12.to;
	        return other !== _this;
	      });
	    });
	  };

	  return Node;
	}();

	var Edge = function Edge(a, b) {
	  babelHelpers.classCallCheck(this, Edge);

	  this.to = b;

	  if (!(this.to instanceof Node)) {
	    throw new TypeError('Value of "this.to" violates contract.\n\nExpected:\nNode\n\nGot:\n' + _inspect$3(this.to));
	  }

	  this.weight = a.pos.dist(b.pos);

	  if (!(typeof this.weight === 'number')) {
	    throw new TypeError('Value of "this.weight" violates contract.\n\nExpected:\nnumber\n\nGot:\n' + _inspect$3(this.weight));
	  }
	};

	var VisibilityGraph = function () {
	  function VisibilityGraph(nodes, polygon) {
	    babelHelpers.classCallCheck(this, VisibilityGraph);

	    if (!(Array.isArray(nodes) && nodes.every(function (item) {
	      return item instanceof Node;
	    }))) {
	      throw new TypeError('Value of argument "nodes" violates contract.\n\nExpected:\nNode[]\n\nGot:\n' + _inspect$3(nodes));
	    }

	    if (!(polygon instanceof Polygon)) {
	      throw new TypeError('Value of argument "polygon" violates contract.\n\nExpected:\nPolygon\n\nGot:\n' + _inspect$3(polygon));
	    }

	    this.nodes = nodes;
	    // has bounding points, subset of points of nodes

	    if (!(Array.isArray(this.nodes) && this.nodes.every(function (item) {
	      return item instanceof Node;
	    }))) {
	      throw new TypeError('Value of "this.nodes" violates contract.\n\nExpected:\nNode[]\n\nGot:\n' + _inspect$3(this.nodes));
	    }

	    this.polygon = polygon;
	  }

	  VisibilityGraph.prototype.linkNodes = function linkNodes(n1, n2) {
	    if (!(n1 instanceof Node)) {
	      throw new TypeError('Value of argument "n1" violates contract.\n\nExpected:\nNode\n\nGot:\n' + _inspect$3(n1));
	    }

	    if (!(n2 instanceof Node)) {
	      throw new TypeError('Value of argument "n2" violates contract.\n\nExpected:\nNode\n\nGot:\n' + _inspect$3(n2));
	    }

	    // link nodes
	    n1.link(n2);
	    n2.link(n1);

	    // Add to graph
	    if (! ~this.nodes.indexOf(n1)) {
	      this.nodes.push(n1);
	    }

	    if (! ~this.nodes.indexOf(n2)) {
	      this.nodes.push(n2);
	    }
	  };

	  VisibilityGraph.prototype.connectNode = function connectNode(n) {
	    if (!(n instanceof Node)) {
	      throw new TypeError('Value of argument "n" violates contract.\n\nExpected:\nNode\n\nGot:\n' + _inspect$3(n));
	    }

	    this._connect(this.nodes, n);
	  };

	  VisibilityGraph.prototype.unlinkNode = function unlinkNode(n1) {
	    if (!(n1 instanceof Node)) {
	      throw new TypeError('Value of argument "n1" violates contract.\n\nExpected:\nNode\n\nGot:\n' + _inspect$3(n1));
	    }

	    // remove from neighbours
	    n1.unlink();

	    // remove from graph
	    this.nodes = this.nodes.filter(function (n2) {
	      return n2 !== n1;
	    });

	    if (!(Array.isArray(this.nodes) && this.nodes.every(function (item) {
	      return item instanceof Node;
	    }))) {
	      throw new TypeError('Value of "this.nodes" violates contract.\n\nExpected:\nNode[]\n\nGot:\n' + _inspect$3(this.nodes));
	    }
	  };

	  VisibilityGraph.prototype.draw = function draw(graphics) {
	    if (!(graphics instanceof PIXI.Graphics)) {
	      throw new TypeError('Value of argument "graphics" violates contract.\n\nExpected:\nPIXI.Graphics\n\nGot:\n' + _inspect$3(graphics));
	    }

	    this.nodes.forEach(function (node) {
	      node.neighbours.forEach(function (edge) {
	        var a = node.pos;
	        var b = edge.to.pos;
	        graphics.moveTo(a.x, a.y);
	        graphics.lineTo(b.x, b.y);
	      });
	    });
	  };

	  // private


	  VisibilityGraph.prototype._connect = function _connect(nodes, n1) {
	    var _this2 = this;

	    if (!(Array.isArray(nodes) && nodes.every(function (item) {
	      return item instanceof Node;
	    }))) {
	      throw new TypeError('Value of argument "nodes" violates contract.\n\nExpected:\nNode[]\n\nGot:\n' + _inspect$3(nodes));
	    }

	    if (!(n1 instanceof Node)) {
	      throw new TypeError('Value of argument "n1" violates contract.\n\nExpected:\nNode\n\nGot:\n' + _inspect$3(n1));
	    }

	    nodes.map(function (n2) {
	      return [new Line2(n1.pos, n2.pos), n2];
	    }).filter(function (_ref13) {
	      var l1 = _ref13[0];
	      var n = _ref13[1];
	      return !_this2.polygon.intersectsLine(l1);
	    }).filter(function (_ref14) {
	      var l1 = _ref14[0];
	      var _ = _ref14[1];

	      var len = l1.len();
	      var dir = l1.dir();
	      // getting a whole bunch of points to avoid nasty float errors
	      for (var i = 1; i < 5; i++) {
	        if (_this2.polygon.contains(l1.a.add(dir.scale(i * len / 5)))) {
	          return true;
	        }
	      }
	      return false;
	    }).forEach(function (_ref15) {
	      var _ = _ref15[0];
	      var n2 = _ref15[1];
	      return _this2.linkNodes(n1, n2);
	    });
	  };

	  VisibilityGraph.fromPolygon = function fromPolygon(polygon) {
	    if (!(polygon instanceof Polygon)) {
	      throw new TypeError('Value of argument "polygon" violates contract.\n\nExpected:\nPolygon\n\nGot:\n' + _inspect$3(polygon));
	    }

	    var vecToNode = function (vec) {
	      return new Node(vec.x, vec.y);
	    };
	    var nodes = polygon.bounds.points.map(function (p) {
	      return new Node(p);
	    });
	    nodes = nodes.concat.apply(nodes, polygon.interior.map(function (h) {
	      return h.points.map(function (p) {
	        return new Node(p);
	      });
	    }));
	    var instance = new VisibilityGraph(nodes, polygon);

	    nodes.forEach(function (n1, i) {
	      // no need to go through all, a->b will also link b->a
	      instance._connect(nodes.slice(i + 1), n1);
	    });

	    return instance;
	  };

	  return VisibilityGraph;
	}();

	function _inspect$3(input, depth) {
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
	      var _ret2 = function () {
	        if (depth > maxDepth) return {
	            v: '[...]'
	          };

	        var first = _inspect$3(input[0], depth);

	        if (input.every(function (item) {
	          return _inspect$3(item, depth) === first;
	        })) {
	          return {
	            v: first.trim() + '[]'
	          };
	        } else {
	          return {
	            v: '[' + input.slice(0, maxKeys).map(function (item) {
	              return _inspect$3(item, depth);
	            }).join(', ') + (input.length >= maxKeys ? ', ...' : '') + ']'
	          };
	        }
	      }();

	      if (typeof _ret2 === "object") return _ret2.v;
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
	      return (/^([A-Z_$][A-Z0-9_$]*)$/i.test(key) ? key : JSON.stringify(key)) + ': ' + _inspect$3(input[key], depth) + ';';
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

var graph = Object.freeze({
	  astar: astar,
	  Node: Node,
	  Edge: Edge,
	  VisibilityGraph: VisibilityGraph
	});

	var index = {
	  // observables
	  obs: obs,
	  // genererate various observables
	  obsCreate: obsCreate,
	  Renderer: Renderer,
	  algebra: algebra,
	  graph: graph
	};

	return index;

}));