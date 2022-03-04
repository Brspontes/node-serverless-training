const axios = require("axios");
const cheerio = require("cheerio");
const settings = require("./config/settings");
const aws = require('aws-sdk')
const dynamodb = new aws.DynamoDB.DocumentClient()
const uuid = require('uuid')

'use strict';

class Handler {
  static async main (event) {
    const { data } = axios.get(settings.commitMessageUrl)
    const $ = cheerio.load(data)

    const [commitMessage] = await $('#content').text().trim().split('\n')

    const params = {
      TableName: settings.dbTableName,
      Item: {
        commitMessage,
        id: uuid.v1(),
        createdAt: new Date().toISOString()
      }
    }

    await dynamodb.put(params).promise()

    return {
      statusCode: 200,
      body: 'ok'
    }
  }
}

module.exports = {
  scheduler: Handler.main
}