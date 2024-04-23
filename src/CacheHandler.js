const S3 = require('aws-sdk/clients/s3')
const S3Exception = require('./errors/S3Exception')
const eventParser = require('./helpers/eventParser')
const settings = require('./helpers/settings')

class CacheHandler {
  constructor () {
    const S3 = require('aws-sdk/clients/s3')
    this.s3 = new S3()

    const { bucket, prefix } = eventParser.processSourceBucket(settings.getSetting('SOURCE_BUCKET'))
    this.bucket = bucket
    this.prefix = prefix
  }

  async checkCacheExists (filename) {
    const imageLocation = { Bucket: this.bucket, Key: 'cache/' + filename }
    const headRequest = this.s3.headObject(imageLocation).promise()
      try {
        const result = await headRequest
      } catch(err) {
        if (err && err.name === 'NotFound') {
          return false;
        } else if (err) {
          return false;
        }
      }
    const request = this.s3.getObject(imageLocation).promise()
    try {
      const originalImage = await request
      return Promise.resolve(originalImage)
    } catch (err) {
      const error = new S3Exception(err.statusCode, err.code, err.message)
      // return Promise.reject(error)
      return false
    }
  }

  async putCacheFile (filename, contents) {
    const imageLocation = { Bucket: this.bucket, Key: 'cache/' + filename, Body: contents.BufferImage, ContentType: contents.ContentType }

    try {
      const response = await this.s3.upload(imageLocation).promise();
      console.log('Response: ', response);
      return response;

    } catch (err) {
      console.log(err);
    }

    // return this.s3.putObject(imageLocation, function (err, data) {
    //     if (err) console.log(err, err.stack) // an error occurred
    //     else console.log(data)           // successful response
    //   }
    // )
  }
}


module.exports = CacheHandler