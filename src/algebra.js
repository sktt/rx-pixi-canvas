/*@flow*/
import pibp from 'point-in-big-polygon'

// Serialized point
type SerializedPoint = [number, number]

// Serialized points
type SerializedPoints = Array<SerializedPoint>

// Serialized SimplePolygon type
type SerializedSimplePolygon = SerializedPoints

// Serialized polygon
type SerializedPolygon = {
  bounds: SerializedSimplePolygon,
  holes: Array<SerializedSimplePolygon>
}

export class Vec2 {
  x: number;
  y: number;
  constructor(x: number, y: number) {
    this.x = x
    this.y = y
  }

  arr(): number[] {
    return [this.x, this.y]
  }

  distSq(v: Vec2): number {
    const dx = v.x - this.x
    const dy = v.y - this.y
    return dx * dx + dy * dy
  }

  dist(v: Vec2): number {
    return Math.sqrt(this.distSq(v))
  }

  len(): number {
    return this.dist(Vec2.ORIGO)
  }

  norm(): Vec2 {
    const l = this.len()
    return new Vec2(this.x/l, this.y/l)
  }

  dot(v: Vec2): number {
    return this.x * v.x + this.y * v.y
  }

  scale(m: number): Vec2 {
    return new Vec2(this.x * m, this.y * m)
  }

  add(v: Vec2): Vec2 {
    return new Vec2(this.x + v.x, this.y + v.y)
  }

  sub(v: Vec2): Vec2 {
    return this.add(v.scale(-1))
  }

  equals(o: any): boolean {
    return this === o ||
      this.x === o.x && this.y === o.y
  }

  static fromArray(p: number[]): Vec2 {
    return new Vec2(p[0], p[1])
  }

  static ORIGO = new Vec2(0, 0)

  static INF = new Vec2(Infinity, Infinity)
}



// line ina twod space
export class Line2 {
  a: Vec2;
  b: Vec2;
  constructor(a, b) {
    this.a = a
    this.b = b
  }
  equals(o: any): boolean {
    return this === o || (this.a.equals(o.a) && this.b.equals(o.b))
  }

  /**
   * gets a point in the center of the line
   * floating point errors will of course occurs
   */
  centerPoint(): Vec2 {
    return this.a.add(this.b).scale(0.5)
  }

  dir(): Vec2 {
    return this.b.sub(this.a).norm()
  }

  len(): number {
    return this.a.dist(this.b)
  }

  intersects(l2: Line2): boolean {
    const s1x = this.b.x - this.a.x
    const s1y = this.b.y - this.a.y
    const s2x = l2.b.x - l2.a.x
    const s2y = l2.b.y - l2.a.y

    const s = (-s1y * (this.a.x - l2.a.x) + s1x * (this.a.y - l2.a.y)) / (-s2x * s1y + s1x * s2y)
    const t = ( s2x * (this.a.y - l2.a.y) - s2y * (this.a.x - l2.a.x)) / (-s2x * s1y + s1x * s2y)

    const eps = 0.00001
    return (0 < (s - eps) && (s + eps) < 1) && (0 < (t - eps) && (t + eps) < 1)
  }

  // Point on this line closest to x
  closestTo(x: Vec2): Vec2 {
    const v = this.dir()
    const s = x.dot(v) / v.dot(v)
    const l = this.len()

    if(s >= this.len()) {
      return this.b
    }

    if(s <= 0) {
      return this.a
    }

    return v.scale(x.dot(v) / v.dot(v)).add(this.a)
  }
  static fromArray(a, b) {
    return new Line2(Vec2.fromArray(a), Vec2.fromArray(b))
  }
}

// Basic polygon without holes and that madness
export class SimplePolygon {
  points: Vec2[];
  constructor(points) {
    this.points = points
  }

  serialize(): SerializedSimplePolygon {
    return this.points.map(
      vec => vec.arr()
    )
  }

  isClockwise(): boolean {
    return this.area() > 0
  }

  area(): number {
    let area = 0
    const first = this.points[0]
    for(let i = 2; i < this.points.length; i++) {
      let p = this.points[i-1]
      let c = this.points[i]
      let e0 = first.sub(p)
      let e1 = first.sub(c)
      area += e0.x * e1.y - e0.y * e1.x
    }
    return area/2
  }

  sides(): Line2[] {
    return this.points.map((p1, i, ps) => new Line2(p1, ps[(i+1) % ps.length]))
  }

  intersectsLine(line: Line2): boolean {
    return this.sides().some(
      l => l.intersects(line)
    )
  }

  intersectsPoly(poly: SimplePolygon) {
    return poly.sides().some(
      line => this.intersectsLine(line)
    )
  }

  contains(test: Vec2, EPS: number = 0.1): boolean {
    // picked up at http://gamedev.stackexchange.com/questions/31741/adding-tolerance-to-a-point-in-polygon-test
    let oldPoint = this.points[this.points.length - 1]
    let oldSqDist = oldPoint.distSq(test)
    let inside = false

    let left = null
    let right = null

    for (let i=0 ; i < this.points.length; i++) {
      let newPoint = this.points[i]
      let newSqDist = newPoint.distSq(test)

      if (oldSqDist + newSqDist + 2 * Math.sqrt(oldSqDist * newSqDist) -
          newPoint.distSq(oldPoint) < EPS) {
        return true
      }

      if (newPoint.x > oldPoint.x) {
        left = oldPoint
        right = newPoint
      } else {
        left = newPoint
        right = oldPoint
      }

      if ((newPoint.x < test.x) == (test.x <= oldPoint.x)
          && (test.y-left.y) * (right.x-left.x)
          < (right.y-left.y) * (test.x-left.x) ) {
        inside = !inside
      }

      oldPoint = newPoint
      oldSqDist = newSqDist
    }

    // no need to check points ???? epsilon shougld do
    return inside || this.points.some(p => p.equals(test))
  }

  nearestEdgePoint(point: Vec2): Vec2 {
    let nearest = Vec2.INF
    this.points.forEach((p1, i, ps) => {
      const p2 = ps[(i+1) % ps.length]
      const near = new Line2(p1, p2).closestTo(point.sub(p1))
      if(near.dist(point) < nearest.dist(point)) {
        nearest = near
      }
    })
    return nearest
  }

  static fromSerialized(bounds: SerializedSimplePolygon): SimplePolygon {
    return new SimplePolygon(bounds.map(Vec2.fromArray))
  }
}

// Extended polygon that supports holes
export class Polygon {
  bounds: SimplePolygon;
  holes: SimplePolygon[];
  constructor(bounds) {
    // Bounds should be counter clockwise
    if(bounds.isClockwise()) {
      console.warn('got clockwise bounds, rewinding to anti-clockwise')
      bounds.points.reverse()
    }
    this.bounds = bounds

    // Holes should be clockwise.
    this.interior = [] // holes

    this.updateClassifier()
  }

  updateClassifier() {
    const {bounds, holes} = this.serialize()
    this.classifyPoint = pibp([bounds].concat(holes || []))
  }

  serialize(): SerializedPolygon {
    return {
      bounds: this.bounds.serialize(),
      holes: this.interior.map(hole => hole.serialize())
    }
  }

  addHole(polygon: SimplePolygon): void {
    if (polygon.points.length < 2) {
      throw Error('Not a polygon')
    }
    if(!this.containsPolygon(polygon)) {
      throw Error('Trying to add interior polygon that is not contained in this')
    }
    if(!polygon.isClockwise()) {
      console.warn('got anti-clockwise hole, rewinding to clockwise')
      polygon.points.reverse()
    }

    this.interior = this.interior.concat(polygon)

    this.updateClassifier()
  }

  containsPolygon(poly: SimplePolygon): boolean {
    // this polygon contains `poly` when no bound side intersects with this and
    // one of `poly`s vertices are interior of this
    return this.contains(poly.points[0]) && !this.intersectsPoly(poly)
  }

  intersectsLine(line: Line2): boolean {
    return this.bounds.intersectsLine(line) || this.interior.some(
      hole => hole.intersectsLine(line)
    )
  }

  intersectsPoly(poly: SimplePolygon): boolean {
    return this.bounds.intersectsPoly(poly) || this.interior.some(
      hole => hole.intersectsPoly(poly)
    )
  }

  containsPIBP(test): number {
    return this.classifyPoint(test.arr())
  }

  contains(test: Vec2): boolean {
    return this.containsPIBP(test) <= 0
  }

  // Gives the nearest point to `point` that is on the edge of the shape
  nearestEdgePoint(point: Vec2): Vec2 {
    let nearest = this.bounds.nearestEdgePoint(point)

    const hole = this.interior.find(
      hole => hole.contains(point)
    )
    if(hole) {
      const near = hole.nearestEdgePoint(point)
      if(near.dist(point) < nearest.dist(point)) {
        nearest = near
      }
    }
    if(this.containsPIBP(nearest) > 0) {
      console.warn('edge point is not inside quick to fix..')
      return this.nearestEdgePoint(point.add(new Vec2(.01, .01)))
    }
    return nearest
  }

  nearestInside(point: Vec2): Vec2 {
    if(this.contains(point)) {
      return point
    }

    return this.nearestEdgePoint(point)
  }

  static fromSerialized({bounds, holes}: SerializedPolygon): Polygon {
    const instance = new Polygon(SimplePolygon.fromSerialized(bounds))

    holes
      // deserialize every hole
      .map(SimplePolygon.fromSerialized)
      // add hole. Maybe constructor should take holes..
      .forEach(::instance.addHole)

    return instance
  }
}

