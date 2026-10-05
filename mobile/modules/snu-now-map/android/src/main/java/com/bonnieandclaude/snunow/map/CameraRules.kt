package com.bonnieandclaude.snunow.map

import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.atan
import kotlin.math.ln
import kotlin.math.log2
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow
import kotlin.math.sin
import kotlin.math.sinh

// The camera's rules of `src/map/types.ts`, worked out in Web Mercator as `src/map/projection.ts` does for the
// plain ground. A zoom is the Web Mercator zoom level at the camera's centre: at zoom z the world is 256 × 2^z points
// wide. Sizes are in points, as React Native's.

data class Position(val latitude: Double, val longitude: Double)

data class Camera(val centre: Position, val zoom: Double)

data class Bounds(val south: Double, val west: Double, val north: Double, val east: Double) {
  val middle: Position
    get() = Position((south + north) / 2, (west + east) / 2)
}

data class Point(val x: Double, val y: Double)

data class Size(val width: Double, val height: Double)

private const val TILE = 256.0
private const val HALF_TURN = 180.0
private const val RADIANS = PI / HALF_TURN

fun project(place: Position, zoom: Double): Point {
  val world = TILE * 2.0.pow(zoom)
  val sine = sin(place.latitude * RADIANS)
  return Point(
    (place.longitude + HALF_TURN) / (2 * HALF_TURN) * world,
    (0.5 - ln((1 + sine) / (1 - sine)) / (4 * PI)) * world,
  )
}

fun unproject(point: Point, zoom: Double): Position {
  val world = TILE * 2.0.pow(zoom)
  return Position(
    atan(sinh(PI * (1 - 2 * point.y / world))) / RADIANS,
    point.x / world * 2 * HALF_TURN - HALF_TURN,
  )
}

// The zoom at which a stretch of the world, measured at zoom 0, is as long as a stretch of the view.
private fun zoomWhere(viewPoints: Double, worldPoints: Double): Double =
  if (worldPoints > 0 && viewPoints > 0) log2(viewPoints / worldPoints) else Double.POSITIVE_INFINITY

// A value kept between two others, or their middle where the room between them is gone.
private fun between(value: Double, low: Double, high: Double): Double =
  if (low > high) (low + high) / 2 else min(max(value, low), high)

class CameraRules(val bounds: Bounds, val minZoom: Double, val maxZoom: Double, val size: Size) {
  private fun topLeft(zoom: Double) = project(Position(bounds.north, bounds.west), zoom)

  private fun bottomRight(zoom: Double) = project(Position(bounds.south, bounds.east), zoom)

  // The lowest zoom allowed: the view fits inside the rectangle from here on.
  val lowestZoom: Double
    get() {
      val topLeft = topLeft(0.0)
      val bottomRight = bottomRight(0.0)
      val fits = max(
        zoomWhere(size.width, bottomRight.x - topLeft.x),
        zoomWhere(size.height, bottomRight.y - topLeft.y),
      )
      return if (fits.isFinite()) max(minZoom, fits) else minZoom
    }

  // Where the map opens: the middle of the rectangle at the lowest zoom allowed.
  val opening: Camera
    get() = settle(Camera(bounds.middle, lowestZoom))

  // A camera brought inside the rules.
  fun settle(camera: Camera): Camera {
    val low = lowestZoom
    val zoom = between(camera.zoom, low, max(low, maxZoom))
    val topLeft = topLeft(zoom)
    val bottomRight = bottomRight(zoom)
    val at = project(camera.centre, zoom)
    val x = between(at.x, topLeft.x + size.width / 2, bottomRight.x - size.width / 2)
    val y = between(at.y, topLeft.y + size.height / 2, bottomRight.y - size.height / 2)
    val inside = unproject(Point(x, y), zoom)
    return Camera(
      Position(
        if (y == at.y) camera.centre.latitude else inside.latitude,
        if (x == at.x) camera.centre.longitude else inside.longitude,
      ),
      zoom,
    )
  }

  // The camera that shows all the points with clear room around them, inside the rules. Null without points.
  fun fit(points: List<Position>, padding: Double): Camera? {
    if (points.isEmpty()) {
      return null
    }
    val projected = points.map { project(it, 0.0) }
    val left = projected.minOf { it.x }
    val right = projected.maxOf { it.x }
    val top = projected.minOf { it.y }
    val bottom = projected.maxOf { it.y }
    val zoom = min(
      zoomWhere(size.width - 2 * padding, right - left),
      zoomWhere(size.height - 2 * padding, bottom - top),
    )
    return settle(Camera(unproject(Point((left + right) / 2, (top + bottom) / 2), 0.0), zoom))
  }

  // Whether two cameras show the same view, to within a point on the screen: a native map measures its camera
  // back with a little noise, and what differs by less is not a move.
  fun same(one: Camera, other: Camera): Boolean {
    if (abs(one.zoom - other.zoom) > STILL_ZOOM) {
      return false
    }
    val a = project(one.centre, one.zoom)
    val b = project(other.centre, one.zoom)
    return abs(a.x - b.x) <= STILL_POINTS && abs(a.y - b.y) <= STILL_POINTS
  }


  companion object {
    private const val STILL_ZOOM = 0.01
    private const val STILL_POINTS = 1.0

    // The zoom at which a stretch of longitude fills a stretch of the view, both measured along the same line.
    fun zoomOf(longitudes: Double, viewPoints: Double): Double =
      log2(viewPoints * 2 * HALF_TURN / (TILE * longitudes))
  }
}
