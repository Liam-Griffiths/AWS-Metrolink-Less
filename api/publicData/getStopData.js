var AWS = require("aws-sdk");
AWS.config.setPromisesDependency(require('bluebird'));
var docClient = new AWS.DynamoDB.DocumentClient();

module.exports.getStopData = (event, context, callback) => {

    (async () => {
        try {

            var params = {
                TableName: "Tramstops",
                Key: {
                    "name": event['pathParameters']['name']
                }
            };

            docClient.get(params, function (err, data) {
                if (err) {
                    callback(null, { statusCode: 500, body: JSON.stringify({status: "error", message:"nothing found", data: null}) });
                } else {
                    callback(null, { statusCode: 200, body: JSON.stringify({status: "success", message:"success", data: data.Item}) });
                }
            });
        } catch (error) {

            callback(null, { statusCode: 500, body: JSON.stringify(error) });

        }
    })();
}