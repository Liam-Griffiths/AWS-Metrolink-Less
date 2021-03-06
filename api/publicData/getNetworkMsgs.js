var AWS = require("aws-sdk");
AWS.config.setPromisesDependency(require('bluebird'));
var docClient = new AWS.DynamoDB.DocumentClient();

module.exports.getNetworkMsgs = (event, context, callback) => {

    (async () => {
        try {

            var params = {
                TableName: "Tramstops",
                Key: {
                    "name": "MSG_LIST"
                }
            };

            docClient.get(params, function (err, data) {
                if (err) {
                    callback(null, { statusCode: 500, body: JSON.stringify({ status: "error", message: "something went wrong", data: err }) });
                } else {
                    data.Item.data = JSON.parse(data.Item.data);
                    callback(null, {
                        statusCode: 200,
                        headers: { "Access-Control-Allow-Origin": "*" },
                        body: JSON.stringify({ status: "success", message: "", data: data.Item })
                    });
                }
            });
        } catch (error) {

            callback(null, { statusCode: 500, body: JSON.stringify(error) });

        }
    })();
}