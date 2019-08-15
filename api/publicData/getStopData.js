var AWS = require("aws-sdk");
AWS.config.setPromisesDependency(require('bluebird'));
var docClient = new AWS.DynamoDB.DocumentClient();

module.exports.getStopData = (event, context, callback) => {

    (async () => {
        try {

            inputStr = event['pathParameters']['name'];
            inputStr = decodeURI(inputStr);

            var params = {
                TableName: "Tramstops",
                Key: {
                    "name": inputStr
                }
            };

            docClient.get(params, function (err, data) {
                if (err) {
                    callback(null, { statusCode: 500, body: JSON.stringify({ status: "error", message: "nothing found", data: [] }) });
                } else {

                    var stopData = JSON.parse(data.Item.data);
                    var fetchTime = data.Item.fetchTime;
                    var timeNow = Date.now()

                    // Finally modulo in a real use case! I'm so happy.
                    var timeDiff = timeNow - fetchTime;
                    var diffMins = Math.floor(timeDiff / 60000);
                    var diffSecs = ((timeDiff % 60000) / 1000).toFixed(0);

                    stopData.forEach(element => {

                        var waitMins = +element.wait;
                        var waitMins = (waitMins - diffMins) - 1;
                        var waitSecs = 60 - diffSecs;

                        if (waitMins < -1) {
                            if (element.status = "Due") {
                                element.status = "Due to Depart";
                            }
                            element.wait = waitMins;
                            element.seconds = 0;
                        }
                        else if (waitMins <= 0) {
                            if (element.status = "Due") {
                                element.status = "Due Now";
                            }
                            element.wait = waitMins;
                            element.seconds = waitSecs;
                        } else {
                            element.wait = waitMins;
                            element.seconds = waitSecs;
                        }

                    });
                    data.Item.data = stopData;
                    callback(null, {
                        statusCode: 200,
                        headers: { "Access-Control-Allow-Origin": "*" },
                        body: JSON.stringify({ status: "success", message: "success", data: data.Item })
                    });
                }
            });
        } catch (error) {

            callback(null, { statusCode: 500, body: JSON.stringify(error) });

        }
    })();
}