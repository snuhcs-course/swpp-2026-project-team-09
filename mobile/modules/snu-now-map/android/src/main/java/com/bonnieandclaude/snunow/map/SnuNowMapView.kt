package com.bonnieandclaude.snunow.map

import android.content.Context
import android.graphics.Color
import android.graphics.PointF
import android.os.SystemClock
import android.util.Log
import android.view.MotionEvent
import com.kakao.vectormap.GestureType
import com.kakao.vectormap.KakaoMap
import com.kakao.vectormap.KakaoMapReadyCallback
import com.kakao.vectormap.LatLng
import com.kakao.vectormap.MapGravity
import com.kakao.vectormap.MapLifeCycleCallback
import com.kakao.vectormap.MapView
import com.kakao.vectormap.camera.CameraAnimation
import com.kakao.vectormap.camera.CameraPosition
import com.kakao.vectormap.camera.CameraUpdateFactory
import com.kakao.vectormap.label.CompetitionType
import com.kakao.vectormap.label.LabelLayer
import com.kakao.vectormap.label.LabelLayerOptions
import com.kakao.vectormap.label.LabelManager
import com.kakao.vectormap.label.OrderingType
import com.kakao.vectormap.route.RouteLine
import com.kakao.vectormap.route.RouteLineOptions
import com.kakao.vectormap.route.RouteLineSegment
import com.kakao.vectormap.route.RouteLineStyle
import com.kakao.vectormap.route.RouteLineStyles
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView
import kotlin.math.log2
import kotlin.math.pow
import kotlin.math.roundToInt

// What a line was last drawn with.
private data class LineLook(val points: List<Position>, val color: String, val width: Double)

private class DrawnLine(val routeLine: RouteLine, var look: LineLook, var z: Int)

// Kakao's map behind the map component, to the rules of `src/map/types.ts`. The SDK takes whole zoom levels only,
// so the camera is set by its height, which is measured against the Web Mercator zoom when the map is ready. The SDK
// does not keep the camera inside a rectangle, so the view brings it back when a move ends outside.
class SnuNowMapView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  override val shouldUseAndroidLayout = true

  private val onThingPress by EventDispatcher<Map<String, Any>>()
  private val onCameraIdle by EventDispatcher<Map<String, Any>>()

  // What the component asked for.
  var bounds = Bounds(0.0, 0.0, 0.0, 0.0)
  var minZoom = 0.0
  var maxZoom = 0.0
  var markers: List<ThingRecord> = emptyList()
  var avatars: List<ThingRecord> = emptyList()
  var lines: List<LineRecord> = emptyList()
  var looks = LooksRecord()
  var inset = InsetRecord()

  private val mapView = MapView(context)
  private val density = resources.displayMetrics.density
  private var started = false
  private var map: KakaoMap? = null
  private var markerThings: Things? = null
  private var avatarThings: Things? = null
  // The lines drawn, by their `id`.
  private val drawnLines = mutableMapOf<String, DrawnLine>()
  // Where the logo was last put, as its margins from the bottom right in points, so that it is moved only when they
  // change.
  private var logoAt: Pair<Double, Double>? = null
  // What the screen asked of the camera before the map was ready, the last request only, carried out once it opens.
  private var waiting: (() -> Unit)? = null

  // The camera as last reported, whether the map has opened on the campus, and whether a finger moves it now.
  private var reported: Camera? = null
  private var opened = false
  private var touched = false
  // The Web Mercator zoom plus the binary logarithm of the camera's height, and the zoom less the SDK's level: both
  // are the same wherever the camera is, and are measured once the map is ready.
  private var heightScale: Double? = null
  private var levelOffset = 0.0
  // How many times in a row this view moved the camera to bring it inside the rules and it came to rest outside
  // again. After a few it stops trying until the next move, so that a map that cannot reach the place does not loop.
  private var corrections = 0
  // Until when a move this view started is still on its way. The SDK takes a moment to begin a move and says that a
  // move ended as soon as another starts, so a camera measured before then is not where it will rest.
  private var movingUntil = 0L
  // Where the last touch began, in the view's pixels, to tell which thing a press was on.
  private var pressedAt: PointF? = null

  init {
    addView(mapView, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
  }

  fun propsUpdated() {
    if (!started) {
      start()
      return
    }
    placeLogo()
    showThings()
    showLines()
    rest()
  }

  fun resume() {
    if (started) {
      mapView.resume()
    }
  }

  fun pause() {
    if (started) {
      mapView.pause()
    }
  }

  // Finishing the map frees its labels and its lines; only the glides are this view's to stop.
  fun destroy() {
    markerThings?.stop()
    avatarThings?.stop()
    map = null
    waiting = null
    if (started) {
      mapView.finish()
    }
  }

  fun moveCamera(move: CameraMoveRecord) {
    val rules = rules()
    val now = measure()
    if (!opened || rules == null || now == null) {
      waiting = { moveCamera(move) }
      return
    }
    val centre = if (move.latitude != null && move.longitude != null) {
      Position(move.latitude, move.longitude)
    } else {
      now.centre
    }
    go(rules, now, rules.settle(Camera(centre, move.zoom ?: now.zoom)), move.animated)
  }

  fun fitTo(points: List<Position>, padding: Double, animated: Boolean) {
    val rules = rules()
    val now = measure()
    if (!opened || rules == null || now == null) {
      waiting = { fitTo(points, padding, animated) }
      return
    }
    go(rules, now, rules.fit(points, padding) ?: return, animated)
  }

  override fun dispatchTouchEvent(event: MotionEvent): Boolean {
    if (event.actionMasked == MotionEvent.ACTION_DOWN) {
      pressedAt = PointF(event.x, event.y)
    }
    return super.dispatchTouchEvent(event)
  }

  // The thing drawn where the press began: an Avatar above a marker.
  private fun thingPressed(): String? {
    val kakaoMap = map ?: return null
    val at = pressedAt ?: return null
    return avatarThings?.at(kakaoMap, at.x, at.y) ?: markerThings?.at(kakaoMap, at.x, at.y)
  }

  override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
    super.onSizeChanged(w, h, oldw, oldh)
    post { if (opened) rest() else open() }
  }

  private fun start() {
    started = true
    // The SDK gives up on a map whose engine takes longer than this to start, and draws no label on it after. Its
    // own 3 seconds were too short on an emulator under load.
    mapView.waitTimeoutMillis = START_TIMEOUT_MS
    mapView.start(
      object : MapLifeCycleCallback() {
        override fun onMapDestroy() {
          map = null
        }

        override fun onMapError(error: Exception) {
          // A wrong key hash or package name ends here, with MapAuthException(401).
          Log.e(TAG, "The map could not start", error)
        }
      },
      object : KakaoMapReadyCallback() {
        override fun onMapReady(kakaoMap: KakaoMap) {
          ready(kakaoMap)
        }

        override fun getPosition(): LatLng = bounds.middle.toLatLng()
      },
    )
    // Left to itself, the SDK pauses its drawing when the view leaves the window, as when another tab or a screen
    // over the map hides it, and does not take it up again when the view comes back: the map stays black. This view
    // finishes the map itself when it is destroyed, so the SDK is told not to.
    mapView.setFinishManually(true)
  }

  private fun ready(kakaoMap: KakaoMap) {
    map = kakaoMap
    drawnLines.clear()
    // The interface's camera looks straight down, north up.
    kakaoMap.setGestureEnable(GestureType.Rotate, false)
    kakaoMap.setGestureEnable(GestureType.Tilt, false)
    logoAt = null
    placeLogo()
    val labels = kakaoMap.labelManager ?: return
    val pictures = Pictures(labels, density)
    markerThings = layer(labels, "markers", MARKER_Z)?.let { Things(it, pictures) }
    avatarThings = layer(labels, "avatars", AVATAR_Z)?.let { Things(it, pictures) }
    kakaoMap.setOnLabelClickListener { _, _, label ->
      val pressed = label.tag as? String
      post {
        val id = thingPressed() ?: pressed
        if (id != null) {
          onThingPress(mapOf("id" to id))
        }
      }
      true
    }
    kakaoMap.setOnCameraMoveStartListener { _, gesture ->
      post {
        if (gesture != GestureType.Unknown) {
          touched = true
          corrections = 0
        }
      }
    }
    kakaoMap.setOnCameraMoveEndListener { _, _, _ ->
      post {
        touched = false
        rest()
      }
    }
    post {
      showThings()
      showLines()
      open()
    }
  }

  // Every Avatar above every marker, and the lines under both.
  private fun layer(labels: LabelManager, id: String, z: Int): LabelLayer? = labels.addLayer(
    LabelLayerOptions.from(id)
      .setOrderingType(OrderingType.Rank)
      .setCompetitionType(CompetitionType.None)
      .setClickable(true)
      .setZOrder(z),
  )

  // The map opens on the middle of the rectangle at the lowest zoom allowed, once it is ready and laid out.
  private fun open() {
    val rules = rules() ?: return
    if (opened) {
      return
    }
    if (!measureScale()) {
      return
    }
    opened = true
    place(rules.opening, animated = false)
    val asked = waiting
    waiting = null
    asked?.invoke()
  }

  // Kakao's logo, unchanged, at the bottom right of what the screen's controls leave of the map (`inset`), so that no
  // control covers it. Kakao's terms let the logo be moved and not hidden. It is placed again when the inset changes,
  // as when a card opens on the main screen.
  private fun placeLogo() {
    val logo = map?.logo ?: return
    val at = Pair(LOGO_MARGIN + inset.right, LOGO_MARGIN + inset.bottom)
    if (at == logoAt) {
      return
    }
    logoAt = at
    logo.setPosition(MapGravity.RIGHT or MapGravity.BOTTOM, pixels(at.first), pixels(at.second))
  }

  private fun showThings() {
    markerThings?.show(markers, looks)
    avatarThings?.show(avatars, looks)
  }

  // One route line of the SDK for each line, kept by its `id`: a new one is added, a kept one whose points or look
  // changed takes the new ones, and one no longer listed is removed. A line's z order is its place in the list, so the
  // later is on top. The SDK draws a line of two points or more.
  private fun showLines() {
    val layer = map?.routeLineManager?.layer ?: return
    val listed = lines.associateBy { it.id }
    drawnLines.keys.filter { id -> (listed[id]?.points?.size ?: 0) < 2 }.forEach { id ->
      drawnLines.remove(id)?.let { layer.remove(it.routeLine) }
    }
    lines.forEachIndexed { z, line ->
      if (line.points.size < 2) {
        return@forEachIndexed
      }
      val look = LineLook(line.points.map { it.toPosition() }, line.color, line.width)
      val drawn = drawnLines[line.id]
      if (drawn == null) {
        val routeLine = layer.addRouteLine(RouteLineOptions.from(segmentOf(look)).setZOrder(z)) ?: return@forEachIndexed
        drawnLines[line.id] = DrawnLine(routeLine, look, z)
        return@forEachIndexed
      }
      if (drawn.look != look) {
        drawn.routeLine.changeSegments(listOf(segmentOf(look)))
        drawn.look = look
      }
      if (drawn.z != z) {
        drawn.routeLine.setZOrder(z)
        drawn.z = z
      }
    }
  }

  private fun segmentOf(look: LineLook): RouteLineSegment {
    val style = RouteLineStyle.from(pixels(look.width), Color.parseColor(look.color))
    return RouteLineSegment.from(look.points.map { it.toLatLng() }, RouteLineStyles.from(style))
  }

  // The camera has come to rest: brought back inside the rules if it is outside, else reported if it moved.
  private fun rest() {
    if (touched || !opened || SystemClock.uptimeMillis() < movingUntil) {
      return
    }
    val rules = rules() ?: return
    val now = measure() ?: return
    val settled = rules.settle(now)
    if (!rules.same(now, settled)) {
      // A camera outside the rules is never reported. It is brought back, and if that fails a few times in a row it
      // is left where it is until the next move.
      if (corrections < MAX_CORRECTIONS) {
        corrections += 1
        // A jump: right after a User's gesture the SDK cuts an animated move short.
        place(settled, animated = false)
      } else {
        Log.w(TAG, "The camera could not be brought back inside the campus: $now")
      }
      return
    }
    corrections = 0
    if (reported?.let { rules.same(it, now) } != true) {
      reported = now
      onCameraIdle(
        mapOf("latitude" to now.centre.latitude, "longitude" to now.centre.longitude, "zoom" to now.zoom),
      )
    }
  }

  private fun go(rules: CameraRules, now: Camera, then: Camera, animated: Boolean) {
    if (!rules.same(now, then)) {
      corrections = 0
      place(then, animated)
    }
  }

  // Moves the camera, and makes sure it is reported: the SDK may end a move without saying so.
  private fun place(camera: Camera, animated: Boolean) {
    val kakaoMap = map ?: return
    val scale = heightScale ?: return
    val height = 2.0.pow(scale - camera.zoom)
    val level = (camera.zoom - levelOffset).roundToInt()
    val update = CameraUpdateFactory.newCameraPosition(
      CameraPosition.from(camera.centre.latitude, camera.centre.longitude, level, 0.0, 0.0, height),
    )
    val takes = if (animated) ANIMATION_MS.toLong() else 0L
    movingUntil = SystemClock.uptimeMillis() + takes + SETTLE_MS
    if (animated) {
      kakaoMap.moveCamera(update, CameraAnimation.from(ANIMATION_MS))
    } else {
      kakaoMap.moveCamera(update)
    }
    postDelayed({ rest() }, takes + SETTLE_MS + SETTLE_MS / 2)
  }

  private fun rules(): CameraRules? {
    if (map == null || mapView.width == 0 || mapView.height == 0) {
      return null
    }
    return CameraRules(bounds, minZoom, maxZoom, Size(mapView.width / density.toDouble(), mapView.height / density.toDouble()))
  }

  // The camera as the map shows it: the SDK's own centre, and the zoom at which the view's width spans what it shows.
  private fun measure(): Camera? {
    val kakaoMap = map ?: return null
    val width = mapView.width
    val height = mapView.height
    if (width == 0 || height == 0) {
      return null
    }
    val left = kakaoMap.fromScreenPoint(0, height / 2) ?: return null
    val right = kakaoMap.fromScreenPoint(width, height / 2) ?: return null
    val centre = kakaoMap.cameraPosition?.position ?: return null
    val zoom = CameraRules.zoomOf(right.longitude - left.longitude, width / density.toDouble())
    return Camera(Position(centre.latitude, centre.longitude), zoom)
  }

  private fun measureScale(): Boolean {
    val kakaoMap = map ?: return false
    val camera = measure() ?: return false
    val position = kakaoMap.cameraPosition ?: return false
    heightScale = camera.zoom + log2(position.height)
    levelOffset = camera.zoom - position.zoomLevel
    Log.i(TAG, "Measured the camera: zoom ${camera.zoom}, height ${position.height}, level ${position.zoomLevel}")
    return true
  }

  private fun pixels(points: Double): Float = (points * density).toFloat()

  private companion object {
    const val LOGO_MARGIN = 8.0
    const val MARKER_Z = LabelManager.DEFAULT_Z_ORDER + 1
    const val AVATAR_Z = LabelManager.DEFAULT_Z_ORDER + 2
    const val ANIMATION_MS = 300
    const val SETTLE_MS = 250L
    const val START_TIMEOUT_MS = 10_000L
    const val MAX_CORRECTIONS = 3
  }
}
