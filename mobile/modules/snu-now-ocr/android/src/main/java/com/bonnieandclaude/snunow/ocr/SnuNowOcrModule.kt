/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

package com.bonnieandclaude.snunow.ocr

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.graphics.Rect
import android.net.Uri
import android.util.Base64
import androidx.exifinterface.media.ExifInterface
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.Text
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.korean.KoreanTextRecognizerOptions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.io.InputStream
import java.nio.ByteBuffer
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import kotlin.math.roundToInt

// The width of the downscaled copy that the reading pipeline works on (`src/features/timetable-ocr/native-ocr.ts`).
private const val PIXELS_WIDTH = 330

// An image whose longer side is above this is decoded at a power-of-two fraction of its size, so that a photo from a
// camera does not fill the memory. A phone's screenshot (up to about 3000 pixels) is read whole.
private const val MAX_DECODED_SIDE = 4096

private class ImageNotReadException(uri: String, cause: Throwable?) :
  CodedException("ERR_OCR_IMAGE", "The image could not be read: $uri", cause)

private class RecognitionFailedException(cause: Throwable?) :
  CodedException("ERR_OCR_RECOGNITION", "ML Kit could not read the text: ${cause?.message}", cause)

// The image upright, as decoded, and the factors from its pixels back to the original's (1 unless it was sampled).
private class Decoded(val bitmap: Bitmap, val width: Int, val height: Int) {
  val factorX: Double = width.toDouble() / bitmap.width
  val factorY: Double = height.toDouble() / bitmap.height
}

// The native OCR module, under the name `src/features/timetable-ocr/native-ocr.ts` asks for. One function reads an
// image's text with ML Kit's Korean recogniser and returns it with a small RGBA copy of the image.
class SnuNowOcrModule : Module() {
  private val recognizer by lazy { TextRecognition.getClient(KoreanTextRecognizerOptions.Builder().build()) }

  // ML Kit answers on the main thread by default; the answer is built here instead, away from the UI.
  private val worker: ExecutorService by lazy { Executors.newSingleThreadExecutor() }

  override fun definition() = ModuleDefinition {
    Name("SnuNowOcr")

    // The answer's shape is `NativeOcrResult` in the JS wrapper. Boxes are in the original image's pixels, upright.
    AsyncFunction("readImage") { uri: String, promise: Promise ->
      val decoded = try {
        decode(uri)
      } catch (error: Throwable) {
        promise.reject(ImageNotReadException(uri, error))
        return@AsyncFunction
      }
      recognizer.process(InputImage.fromBitmap(decoded.bitmap, 0))
        .addOnSuccessListener(worker) { text ->
          try {
            promise.resolve(
              mapOf(
                "width" to decoded.width,
                "height" to decoded.height,
                "lines" to lines(text, decoded),
                "pixels" to pixels(decoded),
              ),
            )
          } catch (error: Throwable) {
            promise.reject(RecognitionFailedException(error))
          } finally {
            decoded.bitmap.recycle()
          }
        }
        .addOnFailureListener(worker) { error ->
          decoded.bitmap.recycle()
          promise.reject(RecognitionFailedException(error))
        }
    }

    OnDestroy {
      recognizer.close()
      worker.shutdown()
    }
  }

  // A `file://` or `content://` URI, as the image picker gives, or a plain path.
  private fun open(uri: String): InputStream {
    val context = appContext.reactContext ?: throw IllegalStateException("No React context")
    val parsed = Uri.parse(uri)
    return if (parsed.scheme == null) {
      File(uri).inputStream()
    } else {
      context.contentResolver.openInputStream(parsed) ?: throw IllegalArgumentException("Nothing at $uri")
    }
  }

  // Decodes the image as ARGB_8888 (a 16-bit PNG would otherwise come as RGBA_F16), sampled down when it is very
  // large, and turned upright by its EXIF orientation. `width` and `height` are the original's, upright.
  private fun decode(uri: String): Decoded {
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    open(uri).use { BitmapFactory.decodeStream(it, null, bounds) }
    if (bounds.outWidth <= 0 || bounds.outHeight <= 0) {
      throw IllegalArgumentException("Not an image")
    }
    var sample = 1
    while (maxOf(bounds.outWidth, bounds.outHeight) / sample > MAX_DECODED_SIDE) {
      sample *= 2
    }
    val options = BitmapFactory.Options().apply {
      inPreferredConfig = Bitmap.Config.ARGB_8888
      inSampleSize = sample
    }
    var bitmap = open(uri).use { BitmapFactory.decodeStream(it, null, options) }
      ?: throw IllegalArgumentException("Not an image")
    if (bitmap.config != Bitmap.Config.ARGB_8888) {
      val converted = bitmap.copy(Bitmap.Config.ARGB_8888, false)
      bitmap.recycle()
      bitmap = converted
    }
    val orientation = open(uri).use {
      ExifInterface(it).getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)
    }
    val matrix = uprightMatrix(orientation)
    if (matrix != null) {
      val upright = Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
      if (upright !== bitmap) {
        bitmap.recycle()
      }
      bitmap = upright
    }
    val turned = orientation in listOf(
      ExifInterface.ORIENTATION_ROTATE_90,
      ExifInterface.ORIENTATION_ROTATE_270,
      ExifInterface.ORIENTATION_TRANSPOSE,
      ExifInterface.ORIENTATION_TRANSVERSE,
    )
    return if (turned) {
      Decoded(bitmap, bounds.outHeight, bounds.outWidth)
    } else {
      Decoded(bitmap, bounds.outWidth, bounds.outHeight)
    }
  }

  // The turn and flip that make an image with this EXIF orientation upright, or null when it already is.
  private fun uprightMatrix(orientation: Int): Matrix? {
    val matrix = Matrix()
    when (orientation) {
      ExifInterface.ORIENTATION_FLIP_HORIZONTAL -> matrix.setScale(-1f, 1f)
      ExifInterface.ORIENTATION_ROTATE_180 -> matrix.setRotate(180f)
      ExifInterface.ORIENTATION_FLIP_VERTICAL -> matrix.setScale(1f, -1f)
      ExifInterface.ORIENTATION_TRANSPOSE -> {
        matrix.setRotate(90f)
        matrix.postScale(-1f, 1f)
      }
      ExifInterface.ORIENTATION_ROTATE_90 -> matrix.setRotate(90f)
      ExifInterface.ORIENTATION_TRANSVERSE -> {
        matrix.setRotate(-90f)
        matrix.postScale(-1f, 1f)
      }
      ExifInterface.ORIENTATION_ROTATE_270 -> matrix.setRotate(-90f)
      else -> return null
    }
    return matrix
  }

  // Lines in reading order, each with its elements (words). A line or element without a box is left out. Android's
  // ML Kit gives every line and element a confidence between 0 and 1.
  private fun lines(text: Text, decoded: Decoded): List<Map<String, Any?>> =
    text.textBlocks.flatMap { block -> block.lines }.mapNotNull { line ->
      val box = line.boundingBox ?: return@mapNotNull null
      mapOf(
        "text" to line.text,
        "box" to box(box, decoded),
        "confidence" to line.confidence.toDouble(),
        "elements" to line.elements.mapNotNull { element ->
          val elementBox = element.boundingBox ?: return@mapNotNull null
          mapOf(
            "text" to element.text,
            "box" to box(elementBox, decoded),
            "confidence" to element.confidence.toDouble(),
          )
        },
      )
    }

  // A box in the decoded bitmap's pixels, scaled back to the original's.
  private fun box(rect: Rect, decoded: Decoded): Map<String, Int> =
    mapOf(
      "x" to (rect.left * decoded.factorX).roundToInt(),
      "y" to (rect.top * decoded.factorY).roundToInt(),
      "w" to (rect.width() * decoded.factorX).roundToInt(),
      "h" to (rect.height() * decoded.factorY).roundToInt(),
    )

  // The image scaled to PIXELS_WIDTH wide (never up), the aspect kept, as RGBA bytes in base64, row by row. `scale` is
  // the original's width over the copy's: original = copy × scale. The copy's height is rounded to whole pixels, so
  // the vertical ratio differs from `scale` by less than half a pixel of the copy over its height (0 for a
  // 1320 × 2868 screenshot).
  private fun pixels(decoded: Decoded): Map<String, Any> {
    val source = decoded.bitmap
    val width = minOf(PIXELS_WIDTH, decoded.width)
    val height = maxOf(1, (decoded.height.toDouble() * width / decoded.width).roundToInt())
    val small = Bitmap.createScaledBitmap(source, width, height, true)
    val buffer = ByteBuffer.allocate(width * height * 4)
    small.copyPixelsToBuffer(buffer)
    if (small !== source) {
      small.recycle()
    }
    return mapOf(
      "width" to width,
      "height" to height,
      "scale" to decoded.width.toDouble() / width,
      "rgba" to Base64.encodeToString(buffer.array(), Base64.NO_WRAP),
    )
  }
}
