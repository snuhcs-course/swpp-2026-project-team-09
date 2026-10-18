/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import ExpoModulesCore
import MLKitTextRecognitionCommon
import MLKitTextRecognitionKorean
import MLKitVision
import UIKit

// The width of the downscaled copy that the reading pipeline works on (`src/features/timetable-ocr/native-ocr.ts`).
private let pixelsWidth = 330

// The native OCR module, under the name `src/features/timetable-ocr/native-ocr.ts` asks for. One function reads an
// image's text with ML Kit's Korean recogniser and returns it with a small RGBA copy of the image. iOS's ML Kit gives
// no confidence, so every `confidence` is null here. Not yet built: the first build is on a Mac.
public class SnuNowOcrModule: Module {
  private lazy var recognizer = TextRecognizer.textRecognizer(options: KoreanTextRecognizerOptions())

  public func definition() -> ModuleDefinition {
    Name("SnuNowOcr")

    // The answer's shape is `NativeOcrResult` in the JS wrapper. Boxes are in the original image's pixels.
    AsyncFunction("readImage") { (uri: String, promise: Promise) in
      guard let image = Self.load(uri) else {
        promise.reject("ERR_OCR_IMAGE", "The image could not be read: \(uri)")
        return
      }
      let visionImage = VisionImage(image: image)
      visionImage.orientation = .up
      self.recognizer.process(visionImage) { text, error in
        guard let text = text, error == nil else {
          promise.reject("ERR_OCR_RECOGNITION", "ML Kit could not read the text: \(error?.localizedDescription ?? "")")
          return
        }
        guard let pixels = Self.pixels(image) else {
          promise.reject("ERR_OCR_IMAGE", "The image could not be scaled: \(uri)")
          return
        }
        let answer: [String: Any] = [
          "width": Int(image.size.width),
          "height": Int(image.size.height),
          "lines": Self.lines(text),
          "pixels": pixels,
        ]
        promise.resolve(answer)
      }
    }
  }

  // A `file://` URI, as the image picker gives, or a plain path. The image is redrawn upright at scale 1, so that its
  // points are its pixels and the boxes need no turning.
  private static func load(_ uri: String) -> UIImage? {
    let path = URL(string: uri).flatMap { $0.isFileURL ? $0.path : nil } ?? uri
    guard let image = UIImage(contentsOfFile: path), let cgImage = image.cgImage else {
      return nil
    }
    let upright = UIImage(cgImage: cgImage, scale: 1, orientation: image.imageOrientation)
    if upright.imageOrientation == .up {
      return upright
    }
    let format = UIGraphicsImageRendererFormat()
    format.scale = 1
    return UIGraphicsImageRenderer(size: upright.size, format: format).image { _ in
      upright.draw(at: .zero)
    }
  }

  // Lines in reading order, each with its elements (words). iOS's ML Kit gives no confidence, which reaches JS as null.
  private static func lines(_ text: MLKitTextRecognitionCommon.Text) -> [[String: Any]] {
    text.blocks.flatMap { $0.lines }.map { line -> [String: Any] in
      let elements: [[String: Any]] = line.elements.map { element -> [String: Any] in
        ["text": element.text, "box": box(element.frame), "confidence": NSNull()]
      }
      return [
        "text": line.text,
        "box": box(line.frame),
        "confidence": NSNull(),
        "elements": elements,
      ]
    }
  }

  private static func box(_ frame: CGRect) -> [String: Int] {
    [
      "x": Int(frame.minX.rounded()),
      "y": Int(frame.minY.rounded()),
      "w": Int(frame.width.rounded()),
      "h": Int(frame.height.rounded()),
    ]
  }

  // The image scaled to `pixelsWidth` wide (never up), the aspect kept, as RGBA bytes in base64, row by row. `scale`
  // turns the copy's pixels back into the original's: original = copy × scale.
  private static func pixels(_ image: UIImage) -> [String: Any]? {
    guard let cgImage = image.cgImage else {
      return nil
    }
    let width = min(pixelsWidth, cgImage.width)
    let height = max(1, Int((Double(cgImage.height) * Double(width) / Double(cgImage.width)).rounded()))
    var bytes = [UInt8](repeating: 0, count: width * height * 4)
    let drawn = bytes.withUnsafeMutableBytes { buffer -> Bool in
      guard
        let context = CGContext(
          data: buffer.baseAddress,
          width: width,
          height: height,
          bitsPerComponent: 8,
          bytesPerRow: width * 4,
          space: CGColorSpaceCreateDeviceRGB(),
          bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
        )
      else {
        return false
      }
      context.interpolationQuality = .high
      context.draw(cgImage, in: CGRect(x: 0, y: 0, width: width, height: height))
      return true
    }
    guard drawn else {
      return nil
    }
    return [
      "width": width,
      "height": height,
      "scale": Double(cgImage.width) / Double(width),
      "rgba": Data(bytes).base64EncodedString(),
    ]
  }
}
