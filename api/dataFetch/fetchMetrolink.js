'use strict';

const fetch = require("node-fetch");
const AWS = require('aws-sdk');

AWS.config.setPromisesDependency(require('bluebird'));

const dynamoDb = new AWS.DynamoDB();
const dynamoDbDocu = new AWS.DynamoDB.DocumentClient();

module.exports.fetchMetrolink = (event, context, callback) => {

    (async () => {
        try {

            createTables();

            const url = 'https://api.tfgm.com/odata/Metrolinks';
            const headers = {
                'Ocp-Apim-Subscription-Key': '52e6831532a445fe921f5fcbb9c3696d'
            }

            const response = await fetch(url, { headers: headers });
            const json = await response.json();

            // stopName, dueTrams[], infoMsg
            var dbArr = [];
            var msgArr = [];
            var nameStrArr = [];

            json.value.forEach(element => {``

                var dueTrams = [];

                // Quickly search if the stop data has already been added to the list.
                var nameIndex = -1
                for (var i = 0; i < dbArr.length; i++) {
                    if (dbArr[i].name === element.StationLocation) {
                        nameIndex = i;
                        break;
                    }
                }

                if (nameIndex == -1) {

                    nameStrArr.push(element.StationLocation);

                    for (var x = 0; x < 4; x++) {
                        if (element['Dest' + x] != "") {
                            dueTrams.push({ destination: element['Dest' + x], carriages: element['Carriages' + x], status: element['Status' + x], wait: element['Wait' + x] })
                        }
                    }

                    dueTrams.sort(dynamicSort("wait"));

                    dbArr.push({
                        name: element.StationLocation,
                        due: dueTrams,
                        infoMsg: element.MessageBoard
                    });

                }
                else {

                    for (var x = 0; x < 4; x++) {
                        if (element['Dest' + x] != "") {
                            dueTrams.push({
                                destination: element['Dest' + x],
                                carriages: element['Carriages' + x],
                                status: element['Status' + x],
                                wait: element['Wait' + x]
                            })
                        }
                    }

                    dbArr[nameIndex].due = dbArr[nameIndex].due.concat(dueTrams);
                    dbArr[nameIndex].due.sort(dynamicSort("wait"));

                    var uniqueArray = dbArr[nameIndex].due.reduce((unique, o) => {
                        if(!unique.some(obj => obj.destination === o.destination && obj.wait === o.wait)) {
                          unique.push(o);
                        }
                        return unique;
                    },[]);

                    dbArr[nameIndex].due = uniqueArray;
                }

                // Quickly search if the message string has already been added to the list.
                if (element.MessageBoard != "<no message>") {
                    var msgIndex = -1;
                    for (var i = 0; i < msgArr.length; i++) {
                        if (msgArr[i] === element.MessageBoard) {
                            msgIndex = i;
                            break;
                        }
                    }

                    if (msgIndex == -1) {
                        msgArr.push(element.MessageBoard)
                    }
                }
            });

            for (var ind = 0; ind < dbArr.length; ind++) {

                var updateParams = {
                    TableName: "Tramstops",
                    Item: {
                        "name": dbArr[ind].name,
                        "data": JSON.stringify(dbArr[ind].due),
                        "infoMsg": dbArr[ind].infoMsg,
                        "fetchTime": Date.now()
                    }
                }
                putToTable(updateParams);
            }

            nameStrArr.sort();

            var updateNames = {
                TableName: "Tramstops",
                Item: {
                    "name": "STOP_LIST",
                    "data": JSON.stringify(nameStrArr),
                }
            }
            putToTable(updateNames);

            var updateNames = {
                TableName: "Tramstops",
                Item: {
                    "name": "MSG_LIST",
                    "data": JSON.stringify(msgArr),
                }
            }
            putToTable(updateNames);

            var returnObj = { stopData: dbArr, msgData: msgArr };

            callback(null, { statusCode: 200, body: JSON.stringify(returnObj) });

        } catch (error) {

            callback(null, { statusCode: 500, body: JSON.stringify(error) });

        }
    })();

    function dynamicSort(property) {
        var sortOrder = 1;
        if (property[0] === "-") {
            sortOrder = -1;
            property = property.substr(1);
        }
        return function (a, b) {
            if (isNumeric(a[property])) {
                a[property] = parseInt(a[property]);
                b[property] = parseInt(b[property]);
            }
            var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
            return result * sortOrder;
        }
    }

    function isNumeric(n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    }

    function putToTable(updateParams) {
        dynamoDbDocu.put(updateParams, (error) => {
            // handle potential errors
            if (error) {
                console.error(error);
                callback(null, {
                    statusCode: error.statusCode || 501,
                    headers: { 'Content-Type': 'text/plain' },
                    body: "Didn't go so well cap'.",
                });
                return;
            }
        });
    }

    function createTables() {
        // change to per req strat
        var params = {
            TableName: "Tramstops",
            KeySchema: [
                { AttributeName: "name", KeyType: "HASH" }  //Partition key
            ],
            AttributeDefinitions: [
                { AttributeName: "name", AttributeType: "S" }
            ],
            ProvisionedThroughput: {
                ReadCapacityUnits: 10,
                WriteCapacityUnits: 10
            }
        };

        dynamoDb.createTable(params, function (err, data) {
            if (err) {
                console.error("Unable to create table. Error JSON:", JSON.stringify(err, null, 2));
            } else {
                console.log("Created table. Table description JSON:", JSON.stringify(data, null, 2));
            }
        });
    }

};
