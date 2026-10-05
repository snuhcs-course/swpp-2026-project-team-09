import ExpoModulesCore

// What `src/map/native-map.tsx` hands over. It flattens the interface of `src/map/types.ts` into these.

struct BoundsRecord: Record {
  @Field var south: Double = 0
  @Field var west: Double = 0
  @Field var north: Double = 0
  @Field var east: Double = 0

  func toBounds() -> Bounds {
    Bounds(south: south, west: west, north: north, east: east)
  }
}

struct PositionRecord: Record {
  @Field var latitude: Double = 0
  @Field var longitude: Double = 0

  func toPosition() -> Position {
    Position(latitude: latitude, longitude: longitude)
  }
}

// Expo's records refuse a null for an optional field ("Cannot cast 'nil'"), and the component sends null for a
// picture not made yet, for a marker without text, and for what a camera move leaves out. So a marker or an Avatar,
// and a camera move, are read from their dictionaries, a null counting as left out.

private func number(_ value: Any?, _ fallback: Double) -> Double {
  (value as? NSNumber)?.doubleValue ?? fallback
}

private func optionalNumber(_ value: Any?) -> Double? {
  (value as? NSNumber)?.doubleValue
}

// A marker or an Avatar. A marker's `glideMs` is 0.
struct ThingRecord {
  let id: String
  let latitude: Double
  let longitude: Double
  // The picture's look and file, nil until it is made; its size in points; the point that stands on the position.
  let look: String
  let uri: String?
  let width: Double
  let height: Double
  let anchorX: Double
  let anchorY: Double
  let text: String?
  let order: Double
  let glideMs: Double

  init(_ dict: [String: Any]) {
    id = dict["id"] as? String ?? ""
    latitude = number(dict["latitude"], 0)
    longitude = number(dict["longitude"], 0)
    look = dict["look"] as? String ?? ""
    uri = dict["uri"] as? String
    width = number(dict["width"], 0)
    height = number(dict["height"], 0)
    anchorX = number(dict["anchorX"], 0.5)
    anchorY = number(dict["anchorY"], 0.5)
    text = dict["text"] as? String
    order = number(dict["order"], 0)
    glideMs = number(dict["glideMs"], 0)
  }
}

// How the map draws what the interface names no colour or width for, from the design system's tokens. The app always
// sends these; the defaults only let the record be made.
struct LooksRecord: Record {
  @Field var routeColor: String = "#2F6BFF"
  @Field var routeWidth: Double = 5
  @Field var textColor: String = "#0E1330"
  @Field var textHaloColor: String = "#FFFFFF"
  @Field var textSize: Double = 11
  // The clear room around each picture, which the text under it starts after.
  @Field var imageMargin: Double = 8
}

struct CameraMoveRecord {
  let latitude: Double?
  let longitude: Double?
  let zoom: Double?
  let animated: Bool

  init(_ dict: [String: Any]) {
    latitude = optionalNumber(dict["latitude"])
    longitude = optionalNumber(dict["longitude"])
    zoom = optionalNumber(dict["zoom"])
    animated = dict["animated"] as? Bool ?? false
  }
}
