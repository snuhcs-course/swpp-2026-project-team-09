package com.bonnieandclaude.snunow.map

import android.content.Context
import android.graphics.Color
import android.os.SystemClock
import android.util.Log
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
  var route: List<Position>? = null
  var looks = LooksRecord()

  private val mapView = MapView(context)
  private val density = resources.displayMetrics.density
  private var started = false
  private var map: KakaoMap? = null
  private var markerThings: Things? = null
  private var avatarThings: Things? = null
  private var routeLine: RouteLine? = null
  private var routeShown: List<Position>? = null

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

  init {
    addView(mapView, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
  }

  fun propsUpdated() {
    if (!started) {
      start()
      return
    }
    showThings()
    showRoute()
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

  // Finishing the map frees its labels and its route; only the glides are this view's to stop.
  fun destroy() {
    markerThings?.stop()
    avatarThings?.stop()
    map = null
    if (started) {
      mapView.finish()
    }
  }

  fun moveCamera(move: CameraMoveRecord) {
    val rules = rules() ?: return
    val now = measure() ?: return
    val centre = if (move.latitude != null && move.longitude != null) {
      Position(move.latitude, move.longitude)
    } else {
      now.centre
    }
    go(rules, now, rules.settle(Camera(centre, move.zoom ?: now.zoom)), move.animated)
  }

  fun fitTo(points: List<Position>, padding: Double, animated: Boolean) {
    val rules = rules() ?: return
    val now = measure() ?: return
    go(rules, now, rules.fit(points, padding) ?: return, animated)
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
  }

  private fun ready(kakaoMap: KakaoMap) {
    map = kakaoMap
    // The interface's camera looks straight down, north up.
    kakaoMap.setGestureEnable(GestureType.Rotate, false)
    kakaoMap.setGestureEnable(GestureType.Tilt, false)
    // Kakao's logo is kept as it is, at the bottom right, apart from the credit at the bottom left.
    kakaoMap.logo?.setPosition(MapGravity.RIGHT or MapGravity.BOTTOM, pixels(LOGO_MARGIN), pixels(LOGO_MARGIN))
    val labels = kakaoMap.labelManager ?: return
    val pictures = Pictures(labels, density)
    markerThings = layer(labels, "markers", MARKER_Z)?.let { Things(it, pictures) }
    avatarThings = layer(labels, "avatars", AVATAR_Z)?.let { Things(it, pictures) }
    kakaoMap.setOnLabelClickListener { _, _, label ->
      val id = label.tag as? String
      if (id != null) {
        post { onThingPress(mapOf("id" to id)) }
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
      showRoute()
      open()
    }
  }

  // Every Avatar above every marker, and the route under both.
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
  }

  private fun showThings() {
    markerThings?.show(markers, looks)
    avatarThings?.show(avatars, looks)
  }

  private fun showRoute() {
    val layer = map?.routeLineManager?.layer ?: return
    if (route == routeShown) {
      return
    }
    routeLine?.let { layer.remove(it) }
    routeLine = null
    routeShown = route
    val points = route ?: return
    if (points.size < 2) {
      return
    }
    val style = RouteLineStyle.from(pixels(looks.routeWidth), Color.parseColor(looks.routeColor))
    val segment = RouteLineSegment.from(points.map { it.toLatLng() }, RouteLineStyles.from(style))
    routeLine = layer.addRouteLine(RouteLineOptions.from(segment))
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
