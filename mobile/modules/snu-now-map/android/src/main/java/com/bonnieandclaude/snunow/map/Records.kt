package com.bonnieandclaude.snunow.map

import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

// What `src/map/native-map.tsx` hands over. It flattens the interface of `src/map/types.ts` into these.

class BoundsRecord : Record {
  @Field val south: Double = 0.0
  @Field val west: Double = 0.0
  @Field val north: Double = 0.0
  @Field val east: Double = 0.0

  fun toBounds() = Bounds(south, west, north, east)
}

class PositionRecord : Record {
  @Field val latitude: Double = 0.0
  @Field val longitude: Double = 0.0

  fun toPosition() = Position(latitude, longitude)
}

// A marker or an Avatar. A marker's `glideMs` is 0.
class ThingRecord : Record {
  @Field val id: String = ""
  @Field val latitude: Double = 0.0
  @Field val longitude: Double = 0.0
  // The picture's look and file, null until it is made; its size in points; the point that stands on the position.
  @Field val look: String = ""
  @Field val uri: String? = null
  @Field val width: Double = 0.0
  @Field val height: Double = 0.0
  @Field val anchorX: Double = 0.5
  @Field val anchorY: Double = 0.5
  @Field val text: String? = null
  @Field val order: Double = 0.0
  @Field val glideMs: Double = 0.0
}

// How the map draws what the interface names no colour or width for, from the design system's tokens. The app always
// sends these; the defaults only let the record be made.
class LooksRecord : Record {
  @Field val routeColor: String = "#2F6BFF"
  @Field val routeWidth: Double = 5.0
  @Field val textColor: String = "#0E1330"
  @Field val textHaloColor: String = "#FFFFFF"
  @Field val textSize: Double = 11.0
  // The clear room around each picture, which the text under it starts after.
  @Field val imageMargin: Double = 8.0
}

class CameraMoveRecord : Record {
  @Field val latitude: Double? = null
  @Field val longitude: Double? = null
  @Field val zoom: Double? = null
  @Field val animated: Boolean = false
}
