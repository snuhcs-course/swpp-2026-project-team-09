import Foundation

// The camera's rules of `src/map/types.ts`, worked out in Web Mercator as `src/map/projection.ts` does for the
// plain ground. A zoom is the Web Mercator zoom level at the camera's centre: at zoom z the world is 256 × 2^z points
// wide. Sizes are in points, as React Native's. The same as the Android side's `CameraRules.kt`.

struct Position: Equatable {
  var latitude: Double
  var longitude: Double
}

struct Camera: Equatable {
  var centre: Position
  var zoom: Double
}

struct Bounds: Equatable {
  var south: Double
  var west: Double
  var north: Double
  var east: Double

  var middle: Position {
    Position(latitude: (south + north) / 2, longitude: (west + east) / 2)
  }
}

struct Point {
  var x: Double
  var y: Double
}

struct Size {
  var width: Double
  var height: Double
}

private let tile = 256.0
private let halfTurn = 180.0
private let radians = Double.pi / halfTurn

func project(_ place: Position, _ zoom: Double) -> Point {
  let world = tile * pow(2, zoom)
  let sine = sin(place.latitude * radians)
  return Point(
    x: (place.longitude + halfTurn) / (2 * halfTurn) * world,
    y: (0.5 - log((1 + sine) / (1 - sine)) / (4 * Double.pi)) * world
  )
}

func unproject(_ point: Point, _ zoom: Double) -> Position {
  let world = tile * pow(2, zoom)
  return Position(
    latitude: atan(sinh(Double.pi * (1 - 2 * point.y / world))) / radians,
    longitude: point.x / world * 2 * halfTurn - halfTurn
  )
}

// The zoom at which a stretch of the world, measured at zoom 0, is as long as a stretch of the view.
private func zoomWhere(_ viewPoints: Double, _ worldPoints: Double) -> Double {
  worldPoints > 0 && viewPoints > 0 ? log2(viewPoints / worldPoints) : Double.infinity
}

// A value kept between two others, or their middle where the room between them is gone.
private func between(_ value: Double, _ low: Double, _ high: Double) -> Double {
  low > high ? (low + high) / 2 : min(max(value, low), high)
}

struct CameraRules {
  let bounds: Bounds
  let minZoom: Double
  let maxZoom: Double
  let size: Size

  private static let stillZoom = 0.01
  private static let stillPoints = 1.0

  private func topLeft(_ zoom: Double) -> Point {
    project(Position(latitude: bounds.north, longitude: bounds.west), zoom)
  }

  private func bottomRight(_ zoom: Double) -> Point {
    project(Position(latitude: bounds.south, longitude: bounds.east), zoom)
  }

  // The lowest zoom allowed: the view fits inside the rectangle from here on.
  var lowestZoom: Double {
    let topLeft = topLeft(0)
    let bottomRight = bottomRight(0)
    let fits = max(
      zoomWhere(size.width, bottomRight.x - topLeft.x),
      zoomWhere(size.height, bottomRight.y - topLeft.y)
    )
    return fits.isFinite ? max(minZoom, fits) : minZoom
  }

  // Where the map opens: the middle of the rectangle at the lowest zoom allowed.
  var opening: Camera {
    settle(Camera(centre: bounds.middle, zoom: lowestZoom))
  }

  // A camera brought inside the rules.
  func settle(_ camera: Camera) -> Camera {
    let low = lowestZoom
    let zoom = between(camera.zoom, low, max(low, maxZoom))
    let topLeft = topLeft(zoom)
    let bottomRight = bottomRight(zoom)
    let at = project(camera.centre, zoom)
    let x = between(at.x, topLeft.x + size.width / 2, bottomRight.x - size.width / 2)
    let y = between(at.y, topLeft.y + size.height / 2, bottomRight.y - size.height / 2)
    let inside = unproject(Point(x: x, y: y), zoom)
    return Camera(
      centre: Position(
        latitude: y == at.y ? camera.centre.latitude : inside.latitude,
        longitude: x == at.x ? camera.centre.longitude : inside.longitude
      ),
      zoom: zoom
    )
  }

  // The camera that shows all the points with clear room around them, inside the rules. Nil without points.
  func fit(_ points: [Position], padding: Double) -> Camera? {
    if points.isEmpty {
      return nil
    }
    let projected = points.map { project($0, 0) }
    let left = projected.map(\.x).min()!
    let right = projected.map(\.x).max()!
    let top = projected.map(\.y).min()!
    let bottom = projected.map(\.y).max()!
    let zoom = min(
      zoomWhere(size.width - 2 * padding, right - left),
      zoomWhere(size.height - 2 * padding, bottom - top)
    )
    return settle(Camera(centre: unproject(Point(x: (left + right) / 2, y: (top + bottom) / 2), 0), zoom: zoom))
  }

  // Whether two cameras show the same view, to within a point on the screen: a native map measures its camera
  // back with a little noise, and what differs by less is not a move.
  func same(_ one: Camera, _ other: Camera) -> Bool {
    if abs(one.zoom - other.zoom) > Self.stillZoom {
      return false
    }
    let a = project(one.centre, one.zoom)
    let b = project(other.centre, one.zoom)
    return abs(a.x - b.x) <= Self.stillPoints && abs(a.y - b.y) <= Self.stillPoints
  }

  // The zoom at which a stretch of longitude fills a stretch of the view, both measured along the same line.
  static func zoomOf(longitudes: Double, viewPoints: Double) -> Double {
    log2(viewPoints * 2 * halfTurn / (tile * longitudes))
  }
}
