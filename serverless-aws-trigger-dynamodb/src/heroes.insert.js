const uuid = require('uuid')
const Joi = require("@hapi/joi")
const decorator = require('./util/decorator')
const globalEnum = require('./util/globalEnum')

class Handler {
    constructor({ dynamodbSvc }) {
        this.dynamodbSvc = dynamodbSvc
        this.dynamodbTable = process.env.DYNAMODB_TABLE
    }

    static validator () {
        return Joi.object({
            nome: Joi.string().max(100).min(2).required(),
            poder: Joi.string().max(20).required()
        })
    }

    prepareData (data) {
        const params = {
            TableName: this.dynamodbTable,
            Item: {
                ...data,
                id: uuid.v1(),
                createdAt: new Date().toISOString()
            }
        }

        return params
    }

    handlerSuccess (data) {
        const response = {
            statusCode: 200,
            body: JSON.stringify(data)
        }

        return response
    }

    handleError (data) {
        return {
            statusCode: data.statusCode || 501,
            headers: { 'Content-type': 'text/plain' },
            body: 'Couldn\'t create item!!'
        }
    }

    async insertItem (params) {
        return this.dynamodbSvc.put(params).promise()
    }

    async main (event) {
        try {
            const data = event.body
            const dbparams = this.prepareData(data)
            await this.insertItem(dbparams)
            return this.handlerSuccess(dbparams.Item)
        } catch (error) {
            return this.handleError({ statusCode: 500 })
        }
    }
}

const aws = require('aws-sdk')
const dynamodb = new aws.DynamoDB.DocumentClient()

const handler = new Handler({
    dynamodbSvc: dynamodb
})
module.exports = decorator(
        handler.main.bind(handler),
        Handler.validator(),
        globalEnum.ARG_TYPE.BODY)