'use strict';

const fetch = require("node-fetch");
const uuid = require('uuid');
const AWS = require('aws-sdk'); 
const spell = require('spell-checker-js');

AWS.config.setPromisesDependency(require('bluebird'));

const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports.fetchMetrolink = (event, context, callback) => {
    
    (async () => {
        try {

            const url = 'https://api.tfgm.com/odata/Metrolinks';
            const headers = {
                'Ocp-Apim-Subscription-Key' : '52e6831532a445fe921f5fcbb9c3696d'
            }

            const response = await fetch(url, {headers: headers});
            const json = await response.json();

            // stopName, dueTrams[], infoMsg
            var dbArr = [];
            var msgArr = [];
            var mistakesArr = [];

            json.value.forEach(element => {

                var dueTrams = [];

                // Quickly search if the stop data has already been added to the list.
                var nameIndex = -1
                for(var i = 0; i < dbArr.length; i++) {
                    if(dbArr[i].name === element.StationLocation) {
                        nameIndex = i;
                        break;
                    }
                }
                
                if(nameIndex == -1){

                    //dbArr.push({name: element.StationLocation});

                    for(var x = 0; x < 4; x++) {
                        if(element['Dest' + x] != "")
                        {
                            dueTrams.push({destination: element['Dest' + x], carriages: element['Carriages' + x], status: element['Status' + x], wait: element['Wait' + x]})
                        }
                    }

                    dbArr.push({  
                        name: element.StationLocation, 
                        due: dueTrams, 
                        infoMsg: element.MessageBoard
                    });

                }
                else{

                    for(var x = 0; x < 4; x++) {
                        if(element['Dest' + x] != "")
                        {
                            dueTrams.push({
                                destination: element['Dest' + x], 
                                carriages: element['Carriages' + x], 
                                status: element['Status' + x], 
                                wait: element['Wait' + x]
                            })
                        }
                    }

                    dbArr[nameIndex].due = dbArr[nameIndex].due.concat(dueTrams);

                }

                // Quickly search if the message string has already been added to the list.
                if(element.MessageBoard != "<no message>")
                {
                    var msgIndex = -1;
                    for(var i = 0; i < msgArr.length; i++) {
                        if(msgArr[i] === element.MessageBoard) {
                            msgIndex = i;
                            break;
                        }
                    }

                    if(msgIndex == -1)
                    {
                        msgArr.push(element.MessageBoard)
                    }
                }

            });

            mistakesArr = checkSpelling(msgArr);

            var returnArr = {stopData: dbArr, msgData: msgArr, mistakeData: mistakesArr};
            lambdaComplete(returnArr);

        } catch (error) {

           callback(null, { statusCode: 500, body: JSON.stringify(error) });

        }
    })();

    function checkSpelling(inputArr = []){
        var outputArr = [];

        spell.load('en');

        inputArr.forEach(element => {
            const originalStr = element;
            var cleanStr = element;

            cleanStr = cleanStr.replace(/\b\#\w+/g, ''); // remove hashtags
            cleanStr = cleanStr.replace(/\B@[a-z0-9_-]+/gi, ''); // remove twitter @'s
            cleanStr = cleanStr.replace(/(?:https?|ftp):\/\/[\n\S]+/g, ''); // remove urls
            cleanStr = cleanStr.replace(/(\d+)(?:st|nd|rd|th)/, '')

            const check = spell.check(cleanStr);
            var cleanMistakes = spellCheckNormalise(check);
            if(cleanMistakes.length > 0)
            {
                outputArr.push({message: originalStr, mistakes: cleanMistakes});
            }
        });

        return outputArr;
    }

    function spellCheckNormalise(inputArr = [])
    {
        var outputArr = [];

        var exceptionsArr = [
            "-",
            "tfgm",
            "TFGM",
            "TfGM",
            "MCRMetrolink",
            "mcrmetrolink",
            "MCR",
            "mcr",
            "www",
            "metrolink",
            "uk"
        ];

        inputArr.forEach(element => {

            var didMatch = false;

            // Match initial capitalised eg. "Rochdale"
            if(element.match(/^[A-Z][a-z][A-Za-z]*$/))
            {
                didMatch = true;
            }

            // Match fully capitalised eg. "ROCHDALE"
            if(element.match(/\b[A-Z]+\b/g))
            {
                didMatch = true;
            }

            // Match fully capitalised eg. "ROCHDALE"
            if(element.startsWith("F0"))
            {
                didMatch = true;
            }

            for(var i = 0; i < exceptionsArr.length; i++) {
                if(exceptionsArr[i] === element) {
                    didMatch = true;
                    break;
                }
            }

            if(didMatch == false)
            {
                outputArr.push(element);
            }
        });

        return outputArr;
    }

    function lambdaComplete(responseMsg = "undefined") {

        const response = {
            statusCode: 200,
            body: JSON.stringify({
                message: responseMsg
            }),
        };

        callback(null, response);
    }

};
