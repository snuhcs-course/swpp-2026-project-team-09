package com.bonnieandclaude.snunow.map

import android.animation.ValueAnimator
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color
import android.net.Uri
import android.util.Log
import android.view.animation.LinearInterpolator
import com.kakao.vectormap.KakaoMap
import com.kakao.vectormap.LatLng
import com.kakao.vectormap.label.Label
import com.kakao.vectormap.label.LabelLayer
import com.kakao.vectormap.label.LabelManager
import com.kakao.vectormap.label.LabelOptions
import com.kakao.vectormap.label.LabelStyle
import com.kakao.vectormap.label.LabelStyles
import com.kakao.vectormap.label.LabelTextBuilder
import com.kakao.vectormap.label.LabelTextStyle
import kotlin.math.roundToInt

fun Position.toLatLng(): LatLng = LatLng.from(latitude, longitude)

// The pictures of the looks, as the SDK's label styles. A style is registered once under a name made of the look,
// its file and what is drawn with it, so a picture made again under the same look is a new style.
class Pictures(private val manager: LabelManager, private val density: Float) {
  // The files that could not be read, so that each is tried once and not on every change of the lists.
  private val unreadable = HashSet<String>()
  // Each style's picture, by the style's name, for telling where a picture is clear.
  private val bitmaps = HashMap<String, Bitmap>()

  fun bitmapOf(name: String): Bitmap? = bitmaps[name]

  private fun pixels(points: Double): Float = (points * density).toFloat()

  fun styles(thing: ThingRecord, looks: LooksRecord): LabelStyles? {
    val uri = thing.uri ?: return null
    val withText = !thing.text.isNullOrEmpty()
    val name = "${thing.look}|$uri|${thing.anchorX}|${thing.anchorY}|$withText"
    manager.getLabelStyles(name)?.let { return it }
    if (uri in unreadable) {
      return null
    }
    val bitmap = read(uri, thing.width, thing.height)
    if (bitmap == null) {
      unreadable.add(uri)
      return null
    }
    bitmaps[name] = bitmap
    // The file holds the phone's pixels, so the picture is drawn pixel for pixel, at its size in points.
    var style = LabelStyle.from(bitmap)
      .setAnchorPoint(thing.anchorX.toFloat(), thing.anchorY.toFloat())
      .setApplyDpScale(false)
    if (withText) {
      // The SDK's own text under the picture, drawn into the picture's clear room at its foot.
      style = style
        .setTextStyles(
          LabelTextStyle.from(
            pixels(looks.textSize).roundToInt(),
            Color.parseColor(looks.textColor),
            pixels(TEXT_HALO).roundToInt(),
            Color.parseColor(looks.textHaloColor),
          ),
        )
        .setPadding(-pixels(looks.imageMargin))
    }
    return manager.addLabelStyles(LabelStyles.from(name, style))
  }

  // The picture's file, at the phone's pixels for its size in points. Null when it cannot be read.
  private fun read(uri: String, width: Double, height: Double): Bitmap? {
    val path = Uri.parse(uri).path ?: return null
    val bitmap = BitmapFactory.decodeFile(path)
    if (bitmap == null) {
      Log.w(TAG, "Could not read the picture $uri")
      return null
    }
    val wide = pixels(width).roundToInt()
    val high = pixels(height).roundToInt()
    if (wide <= 0 || high <= 0 || (bitmap.width == wide && bitmap.height == high)) {
      return bitmap
    }
    return Bitmap.createScaledBitmap(bitmap, wide, high, true)
  }

  private companion object {
    const val TEXT_HALO = 2.0
  }
}

// The markers or the Avatars of one list, as labels on one layer. A label is drawn once its picture is there. The
// layer ranks them: the higher `order` on top, and of two that are equal the later in the list.
class Things(private val layer: LabelLayer, private val pictures: Pictures) {
  private class Held(
    var target: Position,
    var shown: Position,
    var label: Label? = null,
    var glide: ValueAnimator? = null,
    var style: String? = null,
    var text: String? = null,
    var rank: Long = 0,
    var anchorX: Float = 0.5f,
    var anchorY: Float = 0.5f,
  )

  private val held = HashMap<String, Held>()

  fun show(things: List<ThingRecord>, looks: LooksRecord) {
    val ids = things.map { it.id }.toSet()
    for (id in held.keys.filter { it !in ids }) {
      remove(id)
    }
    val ranks = LongArray(things.size)
    things.indices.sortedBy { things[it].order }.forEachIndexed { rank, index -> ranks[index] = rank.toLong() }
    things.forEachIndexed { index, thing -> update(thing, ranks[index], looks) }
  }

  // The thing whose picture is drawn at a point of the view, in pixels: of those whose picture is not clear there, the
  // one ranked highest. The SDK answers a press with the label whose whole picture holds the point, clear room and all,
  // so a small pin beside an Avatar could not be pressed.
  fun at(map: KakaoMap, x: Float, y: Float): String? = held.entries
    .filter { (_, one) -> one.label != null }
    .sortedByDescending { (_, one) -> one.rank }
    .firstOrNull { (_, one) -> drawnAt(map, one, x, y) }
    ?.key

  private fun drawnAt(map: KakaoMap, one: Held, x: Float, y: Float): Boolean {
    val bitmap = one.style?.let { pictures.bitmapOf(it) } ?: return false
    val point = map.toScreenPoint(one.shown.toLatLng()) ?: return false
    val px = (x - point.x + one.anchorX * bitmap.width).toInt()
    val py = (y - point.y + one.anchorY * bitmap.height).toInt()
    if (px !in 0 until bitmap.width || py !in 0 until bitmap.height) {
      return false
    }
    return Color.alpha(bitmap.getPixel(px, py)) >= SOLID_ALPHA
  }

  fun stop() {
    held.values.forEach { it.glide?.cancel() }
    held.clear()
  }

  private fun remove(id: String) {
    val gone = held.remove(id) ?: return
    gone.glide?.cancel()
    gone.label?.let { layer.remove(it) }
  }

  private fun update(thing: ThingRecord, rank: Long, looks: LooksRecord) {
    val position = Position(thing.latitude, thing.longitude)
    val known = held[thing.id]
    // One that first appears is placed without a glide; a new position is glided to from where it is shown.
    val one = known ?: Held(position, position).also { held[thing.id] = it }
    if (known != null && position != one.target) {
      one.target = position
      glide(one, thing.glideMs.toLong())
    }
    val styles = pictures.styles(thing, looks) ?: return
    val text = thing.text?.takeIf { it.isNotEmpty() }
    val label = one.label
    if (label == null) {
      val options = LabelOptions.from(thing.id, one.shown.toLatLng())
        .setStyles(styles)
        .setRank(rank)
        .setClickable(true)
        .setTag(thing.id)
      text?.let { options.setTexts(LabelTextBuilder().setTexts(it)) }
      one.label = layer.addLabel(options)
    } else {
      if (styles.styleId != one.style || text != one.text) {
        label.changeStylesAndText(styles, LabelTextBuilder().setTexts(*listOfNotNull(text).toTypedArray()))
      }
      if (rank != one.rank) {
        label.changeRank(rank)
      }
    }
    one.style = styles.styleId
    one.anchorX = thing.anchorX.toFloat()
    one.anchorY = thing.anchorY.toFloat()
    one.text = text
    one.rank = rank
  }

  private companion object {
    // A pixel at least this opaque is part of what a picture shows; a fainter one is its shadow or its clear room.
    const val SOLID_ALPHA = 128
  }

  // At an even speed, from where it is shown to its target.
  private fun glide(one: Held, glideMs: Long) {
    one.glide?.cancel()
    one.glide = null
    val from = one.shown
    val to = one.target
    if (glideMs <= 0) {
      one.shown = to
      one.label?.moveTo(to.toLatLng())
      return
    }
    one.glide = ValueAnimator.ofFloat(0f, 1f).apply {
      duration = glideMs
      interpolator = LinearInterpolator()
      addUpdateListener { animator ->
        val share = animator.animatedFraction.toDouble()
        one.shown = Position(
          from.latitude + (to.latitude - from.latitude) * share,
          from.longitude + (to.longitude - from.longitude) * share,
        )
        one.label?.moveTo(one.shown.toLatLng())
      }
      start()
    }
  }
}
