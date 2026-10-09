package com.bonnieandclaude.snunow.map

import android.content.pm.PackageManager
import android.util.Log
import com.kakao.vectormap.KakaoMapSdk
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.Collections
import java.util.WeakHashMap

internal const val TAG = "SnuNowMap"

// The manifest's entry that the app's configuration fills with the Kakao native app key (`app.plugin.ts`).
private const val KEY_NAME = "com.bonnieandclaude.snunow.map.KAKAO_NATIVE_APP_KEY"

// The native map module, under the name `src/map/native-module.ts` asks for. It starts Kakao's SDK with the key from
// the settings, and resumes and pauses every map with the app's screen.
class SnuNowMapModule : Module() {
  private val views: MutableSet<SnuNowMapView> = Collections.newSetFromMap(WeakHashMap())

  override fun definition() = ModuleDefinition {
    Name("SnuNowMap")

    OnCreate {
      val context = appContext.reactContext ?: return@OnCreate
      val key = context.packageManager
        .getApplicationInfo(context.packageName, PackageManager.GET_META_DATA)
        .metaData
        ?.getString(KEY_NAME)
        .orEmpty()
      if (key.isEmpty()) {
        Log.e(TAG, "KAKAO_NATIVE_APP_KEY was empty when the app was built: the map will not start")
      }
      KakaoMapSdk.init(context, key)
    }

    OnActivityEntersForeground {
      views.forEach { it.resume() }
    }

    OnActivityEntersBackground {
      views.forEach { it.pause() }
    }

    View(SnuNowMapView::class) {
      Events("onThingPress", "onCameraIdle")

      Prop("bounds") { view: SnuNowMapView, bounds: BoundsRecord ->
        view.bounds = bounds.toBounds()
      }
      Prop("minZoom") { view: SnuNowMapView, zoom: Double ->
        view.minZoom = zoom
      }
      Prop("maxZoom") { view: SnuNowMapView, zoom: Double ->
        view.maxZoom = zoom
      }
      Prop("minLevel") { view: SnuNowMapView, level: Int? ->
        view.minLevel = level
      }
      Prop("markers") { view: SnuNowMapView, markers: List<ThingRecord> ->
        view.markers = markers
      }
      Prop("avatars") { view: SnuNowMapView, avatars: List<ThingRecord> ->
        view.avatars = avatars
      }
      Prop("lines") { view: SnuNowMapView, lines: List<LineRecord> ->
        view.lines = lines
      }
      Prop("looks") { view: SnuNowMapView, looks: LooksRecord ->
        view.looks = looks
      }
      Prop("inset") { view: SnuNowMapView, inset: InsetRecord ->
        view.inset = inset
      }

      OnViewDidUpdateProps { view: SnuNowMapView ->
        views.add(view)
        view.propsUpdated()
      }

      OnViewDestroys { view: SnuNowMapView ->
        views.remove(view)
        view.destroy()
      }

      AsyncFunction("moveCamera") { view: SnuNowMapView, move: CameraMoveRecord ->
        view.moveCamera(move)
      }.runOnQueue(Queues.MAIN)

      AsyncFunction("fitTo") { view: SnuNowMapView, points: List<PositionRecord>, padding: Double, animated: Boolean ->
        view.fitTo(points.map { it.toPosition() }, padding, animated)
      }.runOnQueue(Queues.MAIN)
    }
  }
}
