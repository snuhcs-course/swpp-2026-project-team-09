/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import KakaoMapsSDK
import QuartzCore
import UIKit

extension Position {
  var mapPoint: MapPoint {
    MapPoint(longitude: longitude, latitude: latitude)
  }
}

// The SDK draws every pixel value, a picture's pixels included, at half the screen's scale: one of its pixels is half
// a point on any screen. A length in points is twice as many of its pixels.
func enginePixels(_ points: Double) -> Double {
  points * 2
}

// A colour of the design system's tokens, "#RRGGBB".
func color(_ hex: String) -> UIColor {
  let digits = hex.hasPrefix("#") ? String(hex.dropFirst()) : hex
  guard digits.count == 6, let value = UInt32(digits, radix: 16) else {
    return .black
  }
  return UIColor(
    red: CGFloat((value >> 16) & 0xFF) / 255,
    green: CGFloat((value >> 8) & 0xFF) / 255,
    blue: CGFloat(value & 0xFF) / 255,
    alpha: 1
  )
}

// The pictures of the looks, as the SDK's Poi styles. A style is registered once under a name made of the look, its
// file and what is drawn with it, so a picture made again under the same look is a new style. The SDK never
// overwrites a style, and frees them all when its engine is reset, which ends these pictures with it.
final class Pictures {
  private static let textHalo = 2.0

  private let manager: LabelManager
  private var registered = Set<String>()
  // The files that could not be read, so that each is tried once and not on every change of the lists.
  private var unreadable = Set<String>()

  init(manager: LabelManager) {
    self.manager = manager
  }

  func style(_ thing: ThingRecord, _ looks: LooksRecord) -> String? {
    guard let uri = thing.uri else {
      return nil
    }
    let withText = !(thing.text ?? "").isEmpty
    let name = "\(thing.look)|\(uri)|\(thing.anchorX)|\(thing.anchorY)|\(withText)"
    if registered.contains(name) {
      return name
    }
    if unreadable.contains(uri) {
      return nil
    }
    guard let picture = read(uri, width: thing.width, height: thing.height) else {
      unreadable.insert(uri)
      return nil
    }
    let icon = PoiIconStyle(symbol: picture, anchorPoint: CGPoint(x: thing.anchorX, y: thing.anchorY))
    let perLevel: PerLevelPoiStyle
    if withText {
      // The SDK's own text under the picture, drawn into the picture's clear room at its foot.
      let words = TextStyle(
        fontSize: UInt(enginePixels(looks.textSize).rounded()),
        fontColor: color(looks.textColor),
        strokeThickness: UInt(enginePixels(Self.textHalo).rounded()),
        strokeColor: color(looks.textHaloColor)
      )
      let text = PoiTextStyle(textLineStyles: [PoiTextLineStyle(textStyle: words)])
      text.textLayouts = [.bottom]
      perLevel = PerLevelPoiStyle(
        iconStyle: icon,
        textStyle: text,
        padding: Float(-enginePixels(looks.imageMargin)),
        level: 0
      )
    } else {
      perLevel = PerLevelPoiStyle(iconStyle: icon, level: 0)
    }
    manager.addPoiStyle(PoiStyle(styleID: name, styles: [perLevel]))
    registered.insert(name)
    return name
  }

  // The picture's file, redrawn at the SDK's pixels for its size in points, so that it is drawn at the view's size.
  // Nil when it cannot be read.
  private func read(_ uri: String, width: Double, height: Double) -> UIImage? {
    let path = URL(string: uri)?.path ?? uri
    guard let image = UIImage(contentsOfFile: path) else {
      NSLog("[SnuNowMap] Could not read the picture %@", uri)
      return nil
    }
    let size = CGSize(
      width: enginePixels(width > 0 ? width : image.size.width).rounded(),
      height: enginePixels(height > 0 ? height : image.size.height).rounded()
    )
    // Drawn into 8-bit RGBA in sRGB: the SDK throws on a picture in a wider format, which UIKit's own renderer may
    // choose on a phone with a wide-colour screen.
    guard let source = image.cgImage,
      let space = CGColorSpace(name: CGColorSpace.sRGB),
      let context = CGContext(
        data: nil,
        width: Int(size.width),
        height: Int(size.height),
        bitsPerComponent: 8,
        bytesPerRow: 0,
        space: space,
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
      )
    else {
      return nil
    }
    context.interpolationQuality = .high
    context.draw(source, in: CGRect(origin: .zero, size: size))
    return context.makeImage().map { UIImage(cgImage: $0, scale: 1, orientation: .up) }
  }
}

// The markers or the Avatars of one list, as Pois on one layer. A Poi is drawn once its picture is there. The layer
// ranks them: the higher `order` on top, and of two that are equal the later in the list.
final class Things: NSObject {
  private struct Glide {
    let from: Position
    let to: Position
    let start: CFTimeInterval
    let duration: CFTimeInterval
  }

  private final class Held {
    var target: Position
    var shown: Position
    var poi: Poi?
    var glide: Glide?
    var style: String?
    var text: String?
    var rank = 0

    init(_ position: Position) {
      target = position
      shown = position
    }
  }

  private let layer: LabelLayer
  private let pictures: Pictures
  private var held: [String: Held] = [:]
  private var frames: CADisplayLink?

  init(layer: LabelLayer, pictures: Pictures) {
    self.layer = layer
    self.pictures = pictures
  }

  func show(_ things: [ThingRecord], _ looks: LooksRecord) {
    let ids = Set(things.map(\.id))
    for id in held.keys where !ids.contains(id) {
      remove(id)
    }
    var ranks = [Int](repeating: 0, count: things.count)
    let byOrder = things.indices.sorted { (things[$0].order, $0) < (things[$1].order, $1) }
    for (rank, index) in byOrder.enumerated() {
      ranks[index] = rank
    }
    for (index, thing) in things.enumerated() {
      update(thing, rank: ranks[index], looks: looks)
    }
  }

  // Resetting the engine frees the Pois; only the glides are this object's to stop.
  func stop() {
    frames?.invalidate()
    frames = nil
    held.removeAll()
  }

  private func remove(_ id: String) {
    guard let gone = held.removeValue(forKey: id) else {
      return
    }
    if gone.poi != nil {
      layer.removePoi(poiID: id)
    }
  }

  private func update(_ thing: ThingRecord, rank: Int, looks: LooksRecord) {
    let position = Position(latitude: thing.latitude, longitude: thing.longitude)
    // One that first appears is placed without a glide; a new position is glided to from where it is shown.
    let known = held[thing.id]
    let one = known ?? Held(position)
    if known == nil {
      held[thing.id] = one
    } else if position != one.target {
      one.target = position
      glide(one, milliseconds: thing.glideMs)
    }
    guard let style = pictures.style(thing, looks) else {
      return
    }
    let text = (thing.text ?? "").isEmpty ? nil : thing.text
    if let poi = one.poi {
      if style != one.style || text != one.text {
        poi.changeTextAndStyle(texts: text.map { [PoiText(text: $0, styleIndex: 0)] } ?? [], styleID: style)
      }
      if rank != one.rank {
        poi.rank = rank
      }
    } else {
      let options = PoiOptions(styleID: style, poiID: thing.id)
      options.rank = rank
      options.clickable = true
      if let text {
        options.addText(PoiText(text: text, styleIndex: 0))
      }
      one.poi = layer.addPoi(option: options, at: one.shown.mapPoint)
      one.poi?.show()
    }
    one.style = style
    one.text = text
    one.rank = rank
  }

  // At an even speed, from where it is shown to its target.
  private func glide(_ one: Held, milliseconds: Double) {
    if milliseconds <= 0 {
      one.glide = nil
      one.shown = one.target
      one.poi?.position = one.shown.mapPoint
      return
    }
    one.glide = Glide(from: one.shown, to: one.target, start: CACurrentMediaTime(), duration: milliseconds / 1000)
    if frames == nil {
      let link = CADisplayLink(target: self, selector: #selector(frame))
      link.add(to: .main, forMode: .common)
      frames = link
    }
    frames?.isPaused = false
  }

  @objc private func frame() {
    let now = CACurrentMediaTime()
    var gliding = false
    for one in held.values {
      guard let glide = one.glide else {
        continue
      }
      let share = min(1, (now - glide.start) / glide.duration)
      one.shown = Position(
        latitude: glide.from.latitude + (glide.to.latitude - glide.from.latitude) * share,
        longitude: glide.from.longitude + (glide.to.longitude - glide.from.longitude) * share
      )
      one.poi?.position = one.shown.mapPoint
      if share < 1 {
        gliding = true
      } else {
        one.glide = nil
      }
    }
    frames?.isPaused = !gliding
  }
}
