/**
 * This file should be used for processes that involve adjusting colors in the image.
 */

/**
 * Applies all of the adjustment edits to the image
 * @param image
 * @param edits
 */
exports.apply = (image, edits) => {
  if (edits.bri) {
    this.bri(image, edits.bri.processedValue)
  }
  if (edits.sharp) {
    this.sharp(image)
  }
}

/**
 *
 * @param {Sharp} image
 * @param {number} val
 */
exports.bri = (image, val) => {
  const adjustments = {
    brigtness: 1,
    lightness: 0
  }
  val = val < -100 ? -100 : val
  val = val > 100 ? 100 : val
  if (val < 0) {
    adjustments.brigtness = (val + 100) / 100
  }
  if (val > 0) {
    adjustments.lightness = val
  }

  image.modulate(adjustments)
}

/**
 *
 * @param {Sharp} image
 */
exports.sharp = (image) => {
  image.sharpen()
}
