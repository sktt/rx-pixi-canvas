/*@flow*/
import {Polygon, Vec2, Line2} from './algebra'

export function astar(start: Node, end: Node): Node[] {
  const heuristic = (a: Node, b: Node): number => a.pos.dist(b.pos)

  let closedSet: Node[] = []
  let openSet: Node[] = [start]

  const cameFrom: Map<Node,number> = new Map()

  // Lowest known cost to key
  const gScore: Map<Node, number> = new Map([[start, 0]])

  // Estimated total cost to end from key
  const fScore: Map<Node, number> = new Map([[start, heuristic(start, end)]])

  //Default to Infinity for undefined keys
  gScore.get = (key: Node): number => gScore.has(key) ? Map.prototype.get.call(gScore, key) : Infinity

  fScore.get = (key: Node): number => fScore.has(key) ? Map.prototype.get.call(fScore, key) : Infinity

  while (openSet.length > 0) {
    // Order by estimate distance
    let current = openSet.sort((n1, n2) => {
      let a = fScore.get(n1)
      let b = fScore.get(n2)
      return a > b ? 1 : a < b ? -1 : 0
    }).shift()

    if (current === end) {
      let t = end
      let path = [t]
      while(cameFrom.has(t)) {
        t = cameFrom.get(t)
        path.unshift(t)
      }
      return path
    }
    closedSet = closedSet.concat(current)
    current.neighbours
      // Neighbour must not already be visited
      .filter((e) => !~closedSet.indexOf(e.to))
      .forEach((e) => {
        const tgscore = gScore.get(current) + e.weight
        if(!~openSet.indexOf(e.to)) {
          openSet = openSet.concat(e.to)
        } else if (tgscore >= gScore.get(e.to)) {
          return
        }
        cameFrom.set(e.to, current)
        gScore.set(e.to, tgscore)
        fScore.set(e.to, tgscore + heuristic(e.to, end))
      })
  }

  // no shortest path :(
  return []
}

export class Node {
  pos: Vec2;
  neighbours: Edge[];
  constructor(pos) {
    this.pos = pos
    this.neighbours = []
  }

  link(other) {
    this.neighbours = this.neighbours.concat(new Edge(this, other))
  }

  unlink() {
    this.neighbours.forEach(({to}) => {
      to.neighbours = to.neighbours.filter(({to: other}) => other !== this)
    })
  }
}

export class Edge {
  to: Node;
  weight: number;
  constructor(a, b) {
    this.to = b
    this.weight = a.pos.dist(b.pos)
  }
}

export class VisibilityGraph {
  nodes: Node[];
  polygon: Polygon;
  constructor(nodes: Node[], polygon: Polygon) {
    this.nodes = nodes
    // has bounding points, subset of points of nodes
    this.polygon = polygon
  }

  linkNodes(n1: Node, n2: Node): void {
    // link nodes
    n1.link(n2)
    n2.link(n1)

    // Add to graph
    if (!~this.nodes.indexOf(n1)) {
      this.nodes.push(n1)
    }

    if (!~this.nodes.indexOf(n2)) {
      this.nodes.push(n2)
    }
  }

  connectNode(n: Node): void {
    this._connect(this.nodes, n)
  }

  unlinkNode(n1: Node): void {
    // remove from neighbours
    n1.unlink()

    // remove from graph
    this.nodes = this.nodes.filter((n2) => n2 !== n1)
  }

  draw(graphics: PIXI.Graphics): void {
    this.nodes.forEach((node) => {
      node.neighbours.forEach((edge) => {
        const a = node.pos
        const b = edge.to.pos
        graphics.moveTo(a.x, a.y)
        graphics.lineTo(b.x, b.y)
      })
    })
  }

  // private
  _connect(nodes: Node[], n1: Node): void {
    nodes
      .map(
        n2 => [new Line2(n1.pos, n2.pos), n2]
      )
      .filter(
        ([l1, n]) => !this.polygon.intersectsLine(l1)
      )
      .filter(
        ([l1, _]) => {
          const len = l1.len()
          const dir = l1.dir()
          // getting a whole bunch of points to avoid nasty float errors
          for(let i = 1; i < 5; i++) {
            if(this.polygon.contains(l1.a.add(dir.scale(i * len/5)))) {
              return true
            }
          }
          return false
        }
      )
      .forEach(
        ([_, n2]) => this.linkNodes(n1, n2)
      )
  }

  static fromPolygon(polygon: Polygon): VisibilityGraph {
    const vecToNode = (vec) => new Node(vec.x, vec.y)
    let nodes = polygon.bounds.points.map((p) => new Node(p))
    nodes = nodes.concat.apply(nodes,
      polygon.interior.map(
        h => h.points.map(
          p => new Node(p)
        )
      )
    )
    const instance = new VisibilityGraph(nodes, polygon)

    nodes.forEach((n1, i) => {
      // no need to go through all, a->b will also link b->a
      instance._connect(nodes.slice(i + 1), n1)
    })

    return instance
  }
}
