/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

package com.bonnieandclaude.snunow.ocr

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Rect
import android.net.Uri
import android.util.Base64
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.Text
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.korean.KoreanTextRecognizerOptions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.nio.ByteBuffer
import kotlin.math.roundToInt

// The width of the downscaled copy that the reading pipeline works on (`src/features/timetable-ocr/native-ocr.ts`).
private const val PIXELS_WIDTH = 330

private class ImageNotReadException(uri: String, cause: Throwable?) :
  CodedException("ERR_OCR_IMAGE", "The image could not be read: $uri", cause)

private class RecognitionFailedException(cause: Throwable?) :
  CodedException("ERR_OCR_RECOGNITION", "ML Kit could not read the text: ${cause?.message}", cause)

// The native OCR module, under the name `src/features/timetable-ocr/native-ocr.ts` asks for. One function reads an
// image's text with ML Kit's Korean recogniser and returns it with a small RGBA copy of the image.
class SnuNowOcrModule : Module() {
  private val recognizer by lazy { TextRecognition.getClient(KoreanTextRecognizerOptions.Builder().build()) }

  override fun definition() = ModuleDefinition {
    Name("SnuNowOcr")

    // The answer's shape is `NativeOcrResult` in the JS wrapper. Boxes are in the original image's pixels.
    AsyncFunction("readImage") { uri: String, promise: Promise ->
      val bitmap = try {
        decode(uri)
      } catch (error: Throwable) {
        promise.reject(ImageNotReadException(uri, error))
        return@AsyncFunction
      }
      recognizer.process(InputImage.fromBitmap(bitmap, 0))
        .addOnSuccessListener { text ->
          try {
            promise.resolve(
              mapOf(
                "width" to bitmap.width,
                "height" to bitmap.height,
                "lines" to lines(text),
                "pixels" to pixels(bitmap),
              ),
            )
          } catch (error: Throwable) {
            promise.reject(RecognitionFailedException(error))
          }
        }
        .addOnFailureListener { error -> promise.reject(RecognitionFailedException(error)) }
    }

    OnDestroy {
      recognizer.close()
    }
  }

  // A `file://` or `content://` URI, as the image picker gives, or a plain path. The bitmap is ARGB_8888 whatever the
  // file holds (a 16-bit PNG would otherwise decode to RGBA_F16). EXIF orientation is not applied: screenshots have
  // none.
  private fun decode(uri: String): Bitmap {
    val context = appContext.reactContext ?: throw IllegalStateException("No React context")
    val parsed = Uri.parse(uri)
    val stream = if (parsed.scheme == null) File(uri).inputStream() else context.contentResolver.openInputStream(parsed)
    val options = BitmapFactory.Options().apply { inPreferredConfig = Bitmap.Config.ARGB_8888 }
    val decoded = stream?.use { BitmapFactory.decodeStream(it, null, options) }
      ?: throw IllegalArgumentException("Not an image")
    return if (decoded.config == Bitmap.Config.ARGB_8888) decoded else decoded.copy(Bitmap.Config.ARGB_8888, false)
  }

  // Lines in reading order, each with its elements (words). A line or element without a box is left out.
  private fun lines(text: Text): List<Map<String, Any?>> =
    text.textBlocks.flatMap { block -> block.lines }.mapNotNull { line ->
      val box = line.boundingBox ?: return@mapNotNull null
      mapOf(
        "text" to line.text,
        "box" to box(box),
        "confidence" to line.confidence.toDouble(),
        "elements" to line.elements.mapNotNull { element ->
          val elementBox = element.boundingBox ?: return@mapNotNull null
          mapOf(
            "text" to element.text,
            "box" to box(elementBox),
            "confidence" to element.confidence.toDouble(),
          )
        },
      )
    }

  private fun box(rect: Rect): Map<String, Int> =
    mapOf("x" to rect.left, "y" to rect.top, "w" to rect.width(), "h" to rect.height())

  // The image scaled to PIXELS_WIDTH wide (never up), the aspect kept, as RGBA bytes in base64, row by row. `scale`
  // turns the copy's pixels back into the original's: original = copy × scale.
  private fun pixels(bitmap: Bitmap): Map<String, Any> {
    val width = minOf(PIXELS_WIDTH, bitmap.width)
    val height = maxOf(1, (bitmap.height.toDouble() * width / bitmap.width).roundToInt())
    val small = Bitmap.createScaledBitmap(bitmap, width, height, true)
    val buffer = ByteBuffer.allocate(width * height * 4)
    small.copyPixelsToBuffer(buffer)
    return mapOf(
      "width" to width,
      "height" to height,
      "scale" to bitmap.width.toDouble() / width,
      "rgba" to Base64.encodeToString(buffer.array(), Base64.NO_WRAP),
    )
  }
}
