const ImageRequest = require('./ImageRequest.js')
const ImageHandler = require('./ImageHandler.js')
const CacheHandler = require('./CacheHandler.js')
const security = require('./helpers/security')
const settings = require('./helpers/settings')

exports.handler = async (event, context, callback) => {
  const beforeHandle = beforeHandleRequest(event)

  if (!beforeHandle.allowed) {
    if (context && context.succeed) { context.succeed(beforeHandle.response) }
    return beforeHandle.response
  }

  try {
    const imageRequest = new ImageRequest(event)
    await imageRequest.process() // This is important! We need to load the metadata off the image and check the format

    const cacheHandler = new CacheHandler()
    const CacheFile = await cacheHandler.checkCacheExists(imageRequest.cacheFilename)
    if(CacheFile !== false) {
      console.log(CacheFile)
      console.log(getResponseHeaders(CacheFile))
      console.log(CacheFile.Body.toString('base64'))
      const response = {
        statusCode: 200,
        headers: getResponseHeaders(CacheFile, null),
        body: CacheFile.Body.toString('base64'),
        isBase64Encoded: true
      }
      if (context && context.succeed) { context.succeed(response) }
      return response
    }

    const imageHandler = new ImageHandler(imageRequest)

    const processedRequest = await imageHandler.process()

    const originalImageSize = imageRequest.originalImageSize
    const newImageSize = processedRequest.ContentLength
    const sizeDifference = newImageSize - originalImageSize

    await cacheHandler.putCacheFile(imageRequest.cacheFilename, processedRequest)

    if (sizeDifference > 0) {
      console.warn('Output size was larger than input size', { newImageSize, originalImageSize, sizeDifference })
    }
    const response = {
      statusCode: 200,
      headers: getResponseHeaders(processedRequest, null),
      body: processedRequest.Body,
      isBase64Encoded: true
    }
    if (context && context.succeed) { context.succeed(response) }
    return response
  } catch (err) {
    console.error('EVENT\n' + JSON.stringify(event, null, 2))
    console.error(JSON.stringify(err))
    const response = {
      statusCode: err.status,
      headers: getResponseHeaders(null, true),
      body: JSON.stringify(err),
      isBase64Encoded: false
    }
    if (context && context.succeed) { context.succeed(response) }
    return response
  }
}

/**
 * Generates the appropriate set of response headers based on a success
 * or error condition.
 * @param processedRequest
 * @param {boolean} isErr - has an error been thrown?
 */
const getResponseHeaders = (processedRequest, isErr) => {
  const timenow = new Date()
  const headers = {
    'Access-Control-Allow-Methods': 'GET',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': true,
    'Last-Modified': timenow.toUTCString()
  }
  const cacheControlDefault = settings.getSetting('DEFAULT_CACHE_CONTROL')
  if (processedRequest) {
    if ('CacheControl' in processedRequest && processedRequest.CacheControl !== undefined) {
      headers['Cache-Control'] = processedRequest.CacheControl
    } else if (cacheControlDefault) {
      headers['Cache-Control'] = cacheControlDefault
    }
    if ('ContentType' in processedRequest) {
      headers['Content-Type'] = processedRequest.ContentType
    }
  }
  if (isErr) {
    headers['Content-Type'] = 'text/plain'
  }
  return headers
}

const beforeHandleRequest = (event) => {
  const result = {
    allowed: true
  }
  if (security.shouldSkipRequest(event.path)) {
    result.allowed = false
    result.response = {
      statusCode: 404,
      headers: getResponseHeaders(null, true),
      body: null,
      isBase64Encoded: false
    }
  }

  return result
}

String.prototype.hashCode = function() {
  var hash = 0,
    i, chr;
  if (this.length === 0) return hash;
  for (i = 0; i < this.length; i++) {
    chr = this.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}