'use strict';

const fetch = require("node-fetch");
const spell = require('spell-checker-js');

module.exports.fetchMistakes = (event, context, callback) => {

    (async () => {
        try {

            const url = 'https://api.tfgm.com/odata/Metrolinks';
            const headers = {
                'Ocp-Apim-Subscription-Key': '52e6831532a445fe921f5fcbb9c3696d'
            }

            const response = await fetch(url, { headers: headers });
            const json = await response.json();

            var msgArr = [];
            var mistakesArr = [];

            json.value.forEach(element => {

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

            mistakesArr = checkSpelling(msgArr);

            var returnObj = { msgData: msgArr, mistakeData: mistakesArr };
            callback(null, { statusCode: 200, body: JSON.stringify(returnObj) });

        } catch (error) {

            callback(null, { statusCode: 500, body: JSON.stringify(error) });

        }
    })();

    function checkSpelling(inputArr = []) {
        var outputArr = [];

        spell.load('en');

        inputArr.forEach(element => {

            const originalStr = element;
            var cleanStr = element;

            cleanStr = cleanStr.replace(/\b\#\w+/g, ''); // remove hashtags
            cleanStr = cleanStr.replace(/\B@[a-z0-9_-]+/gi, ''); // remove twitter @'s
            cleanStr = cleanStr.replace(/(?:https?|ftp):\/\/[\n\S]+/g, ''); // remove urls
            cleanStr = cleanStr.replace(/(\d+)(?:st|nd|rd|th)/, ''); // remove

            // run spellchecker
            const check = spell.check(cleanStr);
            
            var cleanMistakes = spellCheckNormalise(check);
            if (cleanMistakes.length > 0) {
                outputArr.push({ message: originalStr, mistakes: cleanMistakes });
            }

        });

        return outputArr;
    }

    function spellCheckNormalise(inputArr = []) {
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
            "uk",
            "Gdns",
            "gdns",
            "picc",
            "vic"
        ];

        inputArr.forEach(element => {

            var didMatch = false;

            if (element.match(/^[A-Z][a-z][A-Za-z]*$/)) { // looking for words that look like proper nouns. "Rochdale"
                didMatch = true;
            } else if (element.match(/\b[A-Z]+\b/g)) { // looking for all caps words. "ROCHDALE"
                didMatch = true;
            } else if (element.startsWith("F0")) {
                didMatch = true;
            } else if (isNumeric(element)) {
                didMatch = true;
            } else {
                for (var i = 0; i < exceptionsArr.length; i++) {
                    if (exceptionsArr[i] === element) {
                        didMatch = true;
                        break;
                    }
                }
            }

            if (didMatch == false) {
                outputArr.push(element);
            }

        });

        return outputArr;
    }

    function isNumeric(n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    }

};
