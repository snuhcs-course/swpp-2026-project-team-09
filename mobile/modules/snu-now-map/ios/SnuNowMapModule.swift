import ExpoModulesCore
import KakaoMapsSDK

// The Info.plist entry that the app's configuration fills with the Kakao native app key (`app.plugin.ts`).
private let keyName = "com.bonnieandclaude.snunow.map.KAKAO_NATIVE_APP_KEY"

// The native map module, under the name `src/map/native-module.ts` asks for. It hands Kakao's SDK the key from the
// settings, and pauses and activates every map's engine with the app.
public class SnuNowMapModule: Module {
  private let views = NSHashTable<SnuNowMapView>.weakObjects()

  public func definition() -> ModuleDefinition {
    Name("SnuNowMap")

    OnCreate {
      let key = Bundle.main.object(forInfoDictionaryKey: keyName) as? String ?? ""
      if key.isEmpty {
        NSLog("[SnuNowMap] KAKAO_NATIVE_APP_KEY was empty when the app was built: the map will not start")
      }
      SDKInitializer.InitSDK(appKey: key)
    }

    OnAppEntersBackground {
      DispatchQueue.main.async {
        self.views.allObjects.forEach { $0.pause() }
      }
    }

    OnAppBecomesActive {
      DispatchQueue.main.async {
        self.views.allObjects.forEach { $0.resume() }
      }
    }

    View(SnuNowMapView.self) {
      Events("onThingPress", "onCameraIdle")

      Prop("bounds") { (view: SnuNowMapView, bounds: BoundsRecord) in
        view.rectangle = bounds.toBounds()
      }
      Prop("minZoom") { (view: SnuNowMapView, zoom: Double) in
        view.minZoom = zoom
      }
      Prop("maxZoom") { (view: SnuNowMapView, zoom: Double) in
        view.maxZoom = zoom
      }
      Prop("markers") { (view: SnuNowMapView, markers: [[String: Any]]) in
        view.markers = markers.map(ThingRecord.init)
      }
      Prop("avatars") { (view: SnuNowMapView, avatars: [[String: Any]]) in
        view.avatars = avatars.map(ThingRecord.init)
      }
      Prop("lines") { (view: SnuNowMapView, lines: [LineRecord]) in
        view.lines = lines
      }
      Prop("looks") { (view: SnuNowMapView, looks: LooksRecord) in
        view.looks = looks
      }
      Prop("inset") { (view: SnuNowMapView, inset: InsetRecord) in
        view.inset = inset
      }

      OnViewDidUpdateProps { (view: SnuNowMapView) in
        self.views.add(view)
        view.propsUpdated()
      }

      AsyncFunction("moveCamera") { (view: SnuNowMapView, move: [String: Any]) in
        view.moveCamera(CameraMoveRecord(move))
      }.runOnQueue(.main)

      AsyncFunction("fitTo") { (view: SnuNowMapView, points: [PositionRecord], padding: Double, animated: Bool) in
        view.fitTo(points.map { $0.toPosition() }, padding: padding, animated: animated)
      }.runOnQueue(.main)
    }
  }
}
