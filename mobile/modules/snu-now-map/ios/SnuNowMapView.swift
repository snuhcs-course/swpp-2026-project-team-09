import ExpoModulesCore
import KakaoMapsSDK
import UIKit

// What a line was last drawn with.
private struct DrawnLine: Equatable {
  let points: [Position]
  let color: String
  let width: Double
  let z: Int
}

// Kakao's map behind the map component, to the rules of `src/map/types.ts`. The SDK takes whole zoom levels only,
// so the camera is set by its height, which is measured against the Web Mercator zoom when the map is ready. The SDK
// does not keep the camera inside a rectangle, so the view brings it back when a move ends outside. The view drives
// the SDK's engine itself: it starts it when it is put in a window and resets it when it leaves.
final class SnuNowMapView: ExpoView, MapControllerDelegate, KakaoMapEventDelegate {
  private static let mapName = "map"
  private static let lineLayerName = "lines"
  private static let markerZ = 5001
  private static let avatarZ = 5002
  private static let animationMs: UInt = 300
  // How long after a move this view started it waits for the SDK to say the move ended, before it measures anyway.
  private static let settleSeconds = 0.5
  // The SDK gives up on a map whose configuration takes longer than this to arrive. Its own 5 seconds; the Android
  // side needed 10 on an emulator under load.
  private static let startTimeoutMs: UInt = 10_000
  private static let maxCorrections = 3
  // Kakao's logo is this far from the edges of what the controls leave, as the credit is at the bottom left.
  private static let logoMargin = 8.0

  let onThingPress = EventDispatcher()
  let onCameraIdle = EventDispatcher()

  // What the component asked for. `rectangle` is the interface's `bounds`, a name UIView already has.
  var rectangle = Bounds(south: 0, west: 0, north: 0, east: 0)
  var minZoom = 0.0
  var maxZoom = 0.0
  var markers: [ThingRecord] = []
  var avatars: [ThingRecord] = []
  var lines: [LineRecord] = []
  var looks = LooksRecord()
  var inset = InsetRecord()

  private let container = KMViewContainer(frame: .zero)
  private var controller: KMController?
  // Whether this view asked the SDK to prepare its engine and has not reset it since.
  private var prepared = false
  private var map: KakaoMap?
  private var markerThings: Things?
  private var avatarThings: Things?
  // The lines drawn, by their `id`, and the style sets registered, by their look.
  private var drawnLines: [String: DrawnLine] = [:]
  private var lineStyles = Set<String>()
  private var laidOut = CGSize.zero
  // Where the logo was last put, as its offsets from the bottom right, so that it is moved only when they change.
  private var logoAt: CGPoint?

  // The camera as last reported, whether the map has opened on the campus, and whether a finger moves it now.
  private var reported: Camera?
  private var opened = false
  private var touched = false
  // The Web Mercator zoom plus the binary logarithm of the camera's height: the same wherever the camera is. It is
  // measured once the map is ready, again when its size changes, and again after each move this view makes.
  private var heightScale: Double?
  // The camera this view last placed, until a finger moves it. A measure that agrees with it to within a point is
  // taken as it, so that a camera read back from the screen does not creep.
  private var placed: Camera?
  // A move this view started and that has not ended yet; each move has its own number.
  private var moving = false
  private var moveNumber = 0
  // How many times in a row this view moved the camera to bring it inside the rules and it came to rest outside
  // again. After a few it stops trying until the next move, so that a map that cannot reach the place does not loop.
  private var corrections = 0
  // What the screen asked of the camera before the map was ready, carried out once it is.
  private var waiting: (() -> Void)?

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    clipsToBounds = true
    container.frame = bounds
    container.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    addSubview(container)
  }

  deinit {
    markerThings?.stop()
    avatarThings?.stop()
    controller?.pauseEngine()
    controller?.resetEngine()
  }

  // MARK: The engine

  override func didMoveToWindow() {
    super.didMoveToWindow()
    if window != nil {
      attach()
    } else {
      detach()
    }
  }

  // Prepares the engine and activates it, unless the app is in the background. The SDK refuses to prepare an engine
  // whose view has no size yet ("ViewSize is zero"), and it reads the size of its own drawing view inside the
  // container, which is laid out after the container. The view is put in a window before it is laid out, so the engine
  // is prepared on the first layout that gives it a size, once the container has laid out its drawing view, and tried
  // once more on the next turn of the main loop if the SDK still finds no size.
  private func attach(retrying: Bool = false) {
    guard window != nil, container.bounds.width > 0, container.bounds.height > 0 else {
      return
    }
    let controller = controller ?? KMController(viewContainer: container)
    if self.controller == nil {
      controller.delegate = self
      self.controller = controller
    }
    if !prepared {
      container.layoutIfNeeded()
      prepared = controller.prepareEngine()
      if !prepared {
        if !retrying {
          DispatchQueue.main.async { [weak self] in self?.attach(retrying: true) }
        }
        return
      }
    }
    if UIApplication.shared.applicationState != .background && !controller.isEngineActive {
      controller.activateEngine()
    }
  }

  // Pauses the engine and resets it, which frees the map with its Pois and lines. Coming back makes a new map, opened
  // on the camera last reported.
  private func detach() {
    controller?.pauseEngine()
    controller?.resetEngine()
    prepared = false
    markerThings?.stop()
    avatarThings?.stop()
    markerThings = nil
    avatarThings = nil
    drawnLines.removeAll()
    lineStyles.removeAll()
    map = nil
    logoAt = nil
    opened = false
    heightScale = nil
    placed = nil
    moving = false
  }

  func pause() {
    if window != nil {
      controller?.pauseEngine()
    }
  }

  func resume() {
    guard window != nil, let controller, controller.isEnginePrepared, !controller.isEngineActive else {
      return
    }
    controller.activateEngine()
  }

  func addViews() {
    let info = MapviewInfo(
      viewName: Self.mapName,
      viewInfoName: "map",
      defaultPosition: rectangle.middle.mapPoint,
      defaultLevel: 15
    )
    controller?.addView(info, viewSize: container.bounds.size, timeout: Self.startTimeoutMs)
  }

  func addViewSucceeded(_ viewName: String, viewInfoName: String) {
    guard let kakaoMap = controller?.getView(Self.mapName) as? KakaoMap else {
      return
    }
    // A size set before the map was added is lost, so it is set again here.
    kakaoMap.viewRect = container.bounds
    ready(kakaoMap)
  }

  func addViewFailed(_ viewName: String, viewInfoName: String) {
    NSLog("[SnuNowMap] The map could not be added: %@", controller?.getStateDescMessage() ?? "")
  }

  func authenticationFailed(_ errorCode: Int, desc: String) {
    // A wrong key or a bundle ID that is not registered ends here, with 401. The SDK has stopped the engine; it is not
    // prepared again until the view comes back, so that a key that cannot work does not loop.
    NSLog("[SnuNowMap] The map could not start: %d %@", errorCode, desc)
  }

  func containerDidResized(_ size: CGSize) {
    map?.viewRect = CGRect(origin: .zero, size: size)
    sized()
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    container.frame = bounds
    if bounds.size != laidOut {
      laidOut = bounds.size
      if !prepared {
        attach()
      }
      map?.viewRect = CGRect(origin: .zero, size: bounds.size)
      sized()
    }
  }

  // MARK: The map

  private func ready(_ kakaoMap: KakaoMap) {
    map = kakaoMap
    kakaoMap.eventDelegate = self
    // The interface's camera looks straight down, north up.
    kakaoMap.setGestureEnable(type: .rotate, enable: false)
    kakaoMap.setGestureEnable(type: .tilt, enable: false)
    kakaoMap.setGestureEnable(type: .rotateZoom, enable: false)
    placeLogo()
    let labels = kakaoMap.getLabelManager()
    let pictures = Pictures(manager: labels)
    markerThings = layer(labels, "markers", Self.markerZ).map { Things(layer: $0, pictures: pictures) }
    avatarThings = layer(labels, "avatars", Self.avatarZ).map { Things(layer: $0, pictures: pictures) }
    showThings()
    showLines()
    open()
  }

  // Every Avatar above every marker, none hiding another, and the lines under both.
  private func layer(_ labels: LabelManager, _ id: String, _ z: Int) -> LabelLayer? {
    let layer = labels.addLabelLayer(
      option: LabelLayerOptions(
        layerID: id,
        competitionType: .none,
        competitionUnit: .symbolFirst,
        orderType: .rank,
        zOrder: z
      )
    )
    layer?.setClickable(true)
    return layer
  }

  func propsUpdated() {
    guard map != nil else {
      return
    }
    placeLogo()
    showThings()
    showLines()
    rest()
  }

  private func sized() {
    DispatchQueue.main.async { [weak self] in
      guard let self else {
        return
      }
      if self.opened {
        _ = self.measureScale()
        self.rest()
      } else {
        self.open()
      }
    }
  }

  // The map opens on the middle of the rectangle at the lowest zoom allowed, once it is ready and laid out; a map made
  // again opens where the last one was.
  private func open() {
    guard !opened, let rules = rules(), measureScale() else {
      return
    }
    opened = true
    place(reported.map { rules.settle($0) } ?? rules.opening, animated: false)
    let asked = waiting
    waiting = nil
    asked?()
  }

  // Kakao's logo, unchanged, at the bottom right of what the screen's controls leave of the map (`inset`), so that no
  // control covers it. Kakao's terms let the logo be moved and not hidden. It is placed again when the inset changes,
  // as when a card opens on the main screen.
  private func placeLogo() {
    guard let map else {
      return
    }
    let offset = CGPoint(x: Self.logoMargin + inset.right, y: Self.logoMargin + inset.bottom)
    if offset == logoAt {
      return
    }
    logoAt = offset
    map.setLogoPosition(origin: GuiAlignment(vAlign: .bottom, hAlign: .right), position: offset)
  }

  private func showThings() {
    markerThings?.show(markers, looks)
    avatarThings?.show(avatars, looks)
  }

  // One route of the SDK for each line, under the line's `id`, in the one route layer: a new one is added, a kept one
  // whose points, look or place in the list changed is drawn again under its `id`, and one no longer listed is
  // removed. A line's z order is its place in the list, so the later is on top. Each look has its style set.
  private func showLines() {
    guard let manager = map?.getRouteManager(),
      let layer = manager.getRouteLayer(layerID: Self.lineLayerName)
        ?? manager.addRouteLayer(layerID: Self.lineLayerName, zOrder: 0)
    else {
      return
    }
    var listed = Set<String>()
    for (z, line) in lines.enumerated() {
      // The SDK draws a segment of two distinct points or more.
      var points: [Position] = []
      for point in line.points.map({ $0.toPosition() }) where point != points.last {
        points.append(point)
      }
      guard points.count >= 2 else {
        continue
      }
      listed.insert(line.id)
      let drawn = DrawnLine(points: points, color: line.color, width: line.width, z: z)
      if drawnLines[line.id] == drawn {
        continue
      }
      if drawnLines[line.id] != nil {
        layer.removeRoute(routeID: line.id)
      }
      let options = RouteOptions(routeID: line.id, styleID: styleOf(drawn, in: manager), zOrder: z)
      options.segments = [RouteSegment(points: points.map(\.mapPoint), styleIndex: 0)]
      layer.addRoute(option: options)?.show()
      drawnLines[line.id] = drawn
    }
    for id in Array(drawnLines.keys) where !listed.contains(id) {
      layer.removeRoute(routeID: id)
      drawnLines[id] = nil
    }
  }

  private func styleOf(_ line: DrawnLine, in manager: RouteManager) -> String {
    let style = "line|\(line.color)|\(line.width)"
    if !lineStyles.contains(style) {
      let look = PerLevelRouteStyle(width: UInt(enginePixels(line.width).rounded()), color: color(line.color), level: 0)
      manager.addRouteStyleSet(RouteStyleSet(styleID: style, styles: [RouteStyle(styles: [look])]))
      lineStyles.insert(style)
    }
    return style
  }

  // MARK: The camera

  func moveCamera(_ move: CameraMoveRecord) {
    guard opened, let rules = rules(), let now = measure() else {
      waiting = { [weak self] in self?.moveCamera(move) }
      return
    }
    var centre = now.centre
    if let latitude = move.latitude, let longitude = move.longitude {
      centre = Position(latitude: latitude, longitude: longitude)
    }
    go(rules, now, rules.settle(Camera(centre: centre, zoom: move.zoom ?? now.zoom)), animated: move.animated)
  }

  func fitTo(_ points: [Position], padding: Double, animated: Bool) {
    guard opened, let rules = rules(), let now = measure() else {
      waiting = { [weak self] in self?.fitTo(points, padding: padding, animated: animated) }
      return
    }
    guard let then = rules.fit(points, padding: padding) else {
      return
    }
    go(rules, now, then, animated: animated)
  }

  func cameraWillMove(kakaoMap: KakaoMap, by: MoveBy) {
    guard by != .notUserAction else {
      return
    }
    DispatchQueue.main.async { [weak self] in
      self?.touched = true
      self?.corrections = 0
      self?.placed = nil
    }
  }

  func cameraDidStopped(kakaoMap: KakaoMap, by: MoveBy) {
    DispatchQueue.main.async { [weak self] in
      if by != .notUserAction {
        self?.touched = false
      }
      self?.rest()
    }
  }

  func poiDidTapped(kakaoMap: KakaoMap, layerID: String, poiID: String, position: MapPoint) {
    DispatchQueue.main.async { [weak self] in
      self?.onThingPress(["id": poiID])
    }
  }

  // The camera has come to rest: brought back inside the rules if it is outside, else reported if it moved.
  private func rest() {
    guard !touched, !moving, opened, let rules = rules(), let now = measure() else {
      return
    }
    let settled = rules.settle(now)
    if !rules.same(now, settled) {
      // A camera outside the rules is never reported. It is brought back, and if that fails a few times in a row it
      // is left where it is until the next move.
      if corrections < Self.maxCorrections {
        corrections += 1
        // A jump, as on the Android side, where an animated move right after a User's gesture was cut short.
        place(settled, animated: false)
      } else {
        NSLog("[SnuNowMap] The camera could not be brought back inside the campus: %@", "\(now)")
      }
      return
    }
    corrections = 0
    if let reported, rules.same(reported, now) {
      return
    }
    reported = now
    onCameraIdle(["latitude": now.centre.latitude, "longitude": now.centre.longitude, "zoom": now.zoom])
  }

  private func go(_ rules: CameraRules, _ now: Camera, _ then: Camera, animated: Bool) {
    if !rules.same(now, then) {
      corrections = 0
      place(then, animated: animated)
    }
  }

  // Moves the camera, and makes sure it is reported once it rests, whether or not the SDK says the move ended.
  private func place(_ camera: Camera, animated: Bool) {
    guard let map, let scale = heightScale else {
      return
    }
    let height = pow(2, scale - camera.zoom)
    let update = CameraUpdate.make(
      cameraPosition: CameraPosition(target: camera.centre.mapPoint, height: height, rotation: 0, tilt: 0)
    )
    placed = camera
    moving = true
    moveNumber += 1
    let number = moveNumber
    let ended: () -> Void = { [weak self] in
      DispatchQueue.main.async {
        guard let self, self.moving, self.moveNumber == number else {
          return
        }
        self.moving = false
        // The scale is measured again wherever the camera rests: one measured while the view was still taking its
        // size is off, and every move would then miss by as much.
        _ = self.measureScale()
        self.rest()
      }
    }
    if animated {
      let options = CameraAnimationOptions(autoElevation: false, consecutive: false, durationInMillis: Self.animationMs)
      map.animateCamera(cameraUpdate: update, options: options, callback: ended)
    } else {
      map.moveCamera(update, callback: ended)
    }
    let takes = animated ? Double(Self.animationMs) / 1000 : 0
    DispatchQueue.main.asyncAfter(deadline: .now() + takes + Self.settleSeconds, execute: ended)
  }

  private func rules() -> CameraRules? {
    let size = container.bounds.size
    guard map != nil, size.width > 0, size.height > 0 else {
      return nil
    }
    return CameraRules(
      bounds: rectangle,
      minZoom: minZoom,
      maxZoom: maxZoom,
      size: Size(width: Double(size.width), height: Double(size.height))
    )
  }

  // The camera as the map shows it: the place under the view's middle, and the zoom at which the left half of the view
  // spans what it shows. The SDK answers a point on the view's right or bottom edge with (0, 0), as outside the map, so
  // the zoom is measured from the left edge to the middle. One that agrees with the camera this view placed is taken
  // as that camera.
  private func measure() -> Camera? {
    guard let camera = measureScreen() else {
      return nil
    }
    if let placed, let rules = rules(), rules.same(camera, placed) {
      return placed
    }
    return camera
  }

  private func measureScreen() -> Camera? {
    let size = container.bounds.size
    guard let map, size.width > 0, size.height > 0 else {
      return nil
    }
    let left = map.getPosition(CGPoint(x: 0, y: size.height / 2)).wgsCoord
    let middle = map.getPosition(CGPoint(x: size.width / 2, y: size.height / 2)).wgsCoord
    let zoom = CameraRules.zoomOf(longitudes: middle.longitude - left.longitude, viewPoints: Double(size.width) / 2)
    guard zoom.isFinite else {
      return nil
    }
    return Camera(centre: Position(latitude: middle.latitude, longitude: middle.longitude), zoom: zoom)
  }

  private func measureScale() -> Bool {
    guard let map, let camera = measureScreen(), map.cameraHeight > 0 else {
      return false
    }
    let scale = camera.zoom + log2(map.cameraHeight)
    let changed = heightScale.map { abs($0 - scale) > 0.001 } ?? true
    heightScale = scale
    guard changed else {
      return true
    }
    NSLog(
      "[SnuNowMap] Measured the camera: zoom %f, height %f, level %d, view %@",
      camera.zoom,
      map.cameraHeight,
      map.zoomLevel,
      NSCoder.string(for: container.bounds.size)
    )
    return true
  }
}
