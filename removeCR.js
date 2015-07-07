/*jslint nomen: true */
/*jslint node:true */

"use strict";




var correctTricoFile = function (fileToConvert) {
    var fs = require('fs-extra'),
        LineByLineReader = require('line-by-line'),
        lr = new LineByLineReader(fileToConvert),
        errorCount = 0,
        preLine = "",
        errorFlag = false,
        newLines = "",
        firstPart = false,
        tempFile = 'test/new.csv';


    lr.on('error', function (err) {
        // 'err' contains error object
    });

    function isInt(n) {
        return n % 1 === 0;
    }

    function startWithH(f) {
        if (f === undefined) {
            return false;
        }
        if (f.charAt(0) === 'h') {
            return true;
        } else {
            return false;
        }
    }

    function appendFile(file, data) {
        var c = fs.appendFileSync(file, data);

    }

    function writeFile(file, data) {
        var fs = require('fs');
        fs.writeFile(file, data, function (err) {
            if (err) {
                return console.log(err);
            }
            fs.renameSync(tempFile, fileToConvert);

        });
    }

    //fs.unlinkSync('test/new.csv');

    lr.on('line', function (line) {
        var firstField = line.split(',')[0],
            secField = line.split(',')[1];
        if (isInt(firstField) && startWithH(secField)) {
            newLines = newLines + '\n' + line;
        } else {
            //console.log(firstField);
            errorCount = errorCount + 1;
            //appendFile('test/new.csv', line);
            newLines = newLines + line;
            //console.log(line);
            //preLine = preLine + line;
            errorFlag = true;
        }

        //appendFile('test/new.csv' , line + '\n');
        //console.log(preLine);
    });

    lr.on('end', function () {
        // All lines are read, file is closed now.
        console.log(errorCount);
        writeFile(tempFile, newLines);
    });

};


correctTricoFile('test/Trico.csv');
