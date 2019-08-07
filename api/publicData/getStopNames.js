var AWS = require("aws-sdk");
AWS.config.setPromisesDependency(require('bluebird'));
var docClient = new AWS.DynamoDB.DocumentClient();

module.exports.getStopNames = (event, context, callback) => {

    (async () => {
        try {

            var params = {
                TableName: "Tramstops",
                Key: {
                    "name": "STOP_LIST"
                }
            };

            docClient.get(params, function (err, data) {
                if (err) {
                    callback(null, { statusCode: 500, body: JSON.stringify({status: "error", message:"something went wrong", data: err}) });
                } else {
                    callback(null, { statusCode: 200, body: JSON.stringify({status: "success", message:"", data: data.Item}) });
                }
            });
        } catch (error) {

            callback(null, { statusCode: 500, body: JSON.stringify(error) });

        }
    })();
}