'use strict';
const { get } = require('axios')
class Handler {
  constructor({ rekoSvc, translate }) {
    this.rekoSvc = rekoSvc
    this.translateSvc = translate
  }

  async detectImageLabels(buffer) {
    const result = await this.rekoSvc.detectLabels({
      Image: {
        Bytes: buffer
      }
    }).promise()

    const workingItems = result.Labels.filter(({ Confidence }) => Confidence > 80)
    const names = workingItems.map(({ Name }) => Name).join(' and ')

    return {names, workingItems}
  }

  async translateText(text) {
    const params = {
      SourceLanguageCode: 'en',
      TargetLanguageCode: 'pt',
      Text: text
    }

    const  { TranslatedText } = await this.translateSvc
      .translateText(params)
      .promise()
    
      return TranslatedText.split(' e ')
  }

  async getImageBuffer(imageUrl) {
    const response = await get(imageUrl, {
      responseType: 'arraybuffer'
    })
    const buffer = Buffer.from(response.data, 'base64')
    return buffer
  }

  formatTextResults(texts, workingItems) {
    const finalText = []
    for (const indexText in texts) {
      const nameInPortuguese = texts[indexText]
      const confidence = workingItems[indexText].Confidence
      finalText.push(`${confidence.toFixed(2)}% de ser do tipo ${nameInPortuguese}`)
    }

    return finalText.join('\n')
  }

  async main (event) {
    try {
      const { imgUrl } = event.queryStringParameters
      const imgBuffer = await this.getImageBuffer(imgUrl)
      const {names, workingItems} = await this.detectImageLabels(imgBuffer)
      
      const texts = await this.translateText(names)
      const finalText = this.formatTextResults(texts, workingItems)
      return {
        statusCode: 200,
        body: finalText.concat('\n')
      }
    } catch (error) {
      console.log('Error***', error.stack)
      return {
        statusCode: 500,
        body: 'Error'
      }
    }
  }
}

const aws = require('aws-sdk')
const reko = new aws.Rekognition()
const translate = new aws.Translate()
const handler = new Handler({
  rekoSvc: reko,
  translate
})

module.exports.main = handler.main.bind(handler);
