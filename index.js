/*jslint nomen: true */
/*jslint node:true */
/*jslint vars: true */
/*jslint es5: true */

/*eslint-env node */
/*eslint quotes: [2, "single"], curly: 2*/
/*eslint no-underscore-dangle: 0 */

'use strict';

var fs = require('fs-extra');
var _ = require('lodash');
var moment = require('moment');
var Promise = require('bluebird');
var XLS = require('xlsjs');
var cdLibEmail = require('cdlib-email');

/*
    Version: 0.1.0
    Description:
        reads in the trico export xls (srcDir)
        copy the xls to local directory (destDir)
        converts to CSV
        after conversion the file is then parsed to remove the carriage returns
    Usage:
        the converted file is used by DPA for daily reports.

*/


// main config object

var syncTrico = {
    srcDir: '\\\\ch01sf00\\groups$\\cis\\CITS Server Inventory\\Trico Export',
    destDir: 'D:/scripts/Servers',
    destFile: 'Trico.csv',
    destFileXLS: 'Trico.xls',
    lastestSrc: null,
    lastSec: 0,
    latestSrcStats: null,
    destFileStats: null,
    srcList: null,
    srcFile: null
};


var emailMsg = cdLibEmail.msgEmail;

emailMsg.to = 'craig.david@mt.com';
emailMsg.from = 'craig.david@mt.com';
emailMsg.subject = 'Trico Pick up and convert process.';
emailMsg.htmlData = 'here is the message';
emailMsg.smtpServer = 'smtp.mt.com';

function readFile(file, cvsFile) {
    return new Promise(function (resolve, reject) {

        console.log(file);

        // converts xls to csv


        var workbook = XLS.readFile(file),
            sheetNameList = workbook.SheetNames,
            //Sheet1A1 = workbook.Sheets[sheetNameList[0]]['A1'].v,
            csv = XLS.utils.sheet_to_csv(workbook.Sheets[sheetNameList[0]]);
        //var LineByLineReader = require('line-by-line');
        //var lineCnt = 0,
        //newoutput = "";
        //lr = new LineByLineReader(cvsFile);


        // write out converted file

        fs.writeFile(cvsFile, csv, function (err) {
            if (err) {
                console.log(err);
                reject(err);
            } else {
                console.log('The file was saved!');
                var input = fs.createReadStream(syncTrico.destDir + '/' + syncTrico.destFile), // read file
                    output = fs.createWriteStream(syncTrico.destDir + '/' + syncTrico.destFile + '.txt'); // write file

                // remove first 3 lines of CSV

                input // take input
                    .pipe(RemoveFirstLine()) // pipe through line remover
                    .pipe(RemoveFirstLine()) // pipe through line remover
                    .pipe(RemoveFirstLine()) // pipe through line remover
                    .pipe(output); // save to file

                setTimeout(function () {
                    fs.unlinkSync(syncTrico.destDir + '/' + syncTrico.destFile);
                    fs.renameSync(syncTrico.destDir + '/' + syncTrico.destFile + '.txt', syncTrico.destDir + '/' + syncTrico.destFile);
                    correctTricoFile(syncTrico.destDir + '/' + syncTrico.destFile);
                    var data = 'File Converted';
                    resolve(data);
                }, 5000);
            }
        });
    });
}
// promise
function checkForFile() {
    return new Promise(function (resolve, reject) {

        syncTrico.destFileStats = fs.statSync(syncTrico.destDir + '/' + syncTrico.destFileXLS);
        syncTrico.srcList = fs.readdirSync(syncTrico.srcDir);

        _.each(syncTrico.srcList, function (f) {
            var stats = fs.statSync(syncTrico.srcDir + '/' + f),
                mt = stats.mtime,
                sec = moment(mt).unix();

            if (sec > syncTrico.lastSec) {
                syncTrico.lastSec = sec;
                syncTrico.latestSrc = f;
                syncTrico.latestSrcStats = stats;
            }
        });

        console.log(syncTrico.latestSrc);

        if (moment(syncTrico.destFileStats.mtime).unix() !== syncTrico.lastSec) {
            console.log('need to copy file');
            fs.copySync(syncTrico.srcDir + '/' + syncTrico.latestSrc, syncTrico.destDir + '/' + syncTrico.destFileXLS, {
                replace: true
            });
            fs.utimesSync(syncTrico.destDir + '/' + syncTrico.destFileXLS, syncTrico.latestSrcStats.atime, syncTrico.latestSrcStats.mtime);
            //readFile(syncTrico.destDir + '/' + syncTrico.destFileXLS, syncTrico.destDir + "/" + syncTrico.destFile, function (done) { console.log("done");});
            resolve(syncTrico.destDir + '/' + syncTrico.destFile);
        } else {
            reject('No file found');
        }

    });
}

checkForFile()
    .then(function (file) {
        readFile(syncTrico.destDir + '/' + syncTrico.destFileXLS, file);
        emailMsg.htmlData = 'Trico File converted:';
        return (file);

    }).catch(function (error) {
        console.log('no file to convert');
        emailMsg.htmlData = 'No new Trico file found to convert. ' + error;
    }).finally(function () {
        console.log('Sending email');
        cdLibEmail.sendEmailHtml(emailMsg);
    });


function copyFile(src, dest, atime, mtime) {
    syncTrico.srcFile = src;
    fs.copySync(src, dest, {
        replace: true
    });

    fs.utimesSync(dest, atime, mtime);
    resolve(src);
}

var Transform = require('stream').Transform;
var util = require('util');


// Transform sctreamer to remove first line

function RemoveFirstLine(args) {
    if (!(this instanceof RemoveFirstLine)) {
        return new RemoveFirstLine(args);
    }
    Transform.call(this, args);
    this._buff = '';
    this._removed = false;
}

util.inherits(RemoveFirstLine, Transform);

RemoveFirstLine.prototype._transform = function (chunk, encoding, done) {
    if (this._removed) { // if already removed
        this.push(chunk); // just push through buffer
    } else {
        // collect string into buffer
        this._buff += chunk.toString();

        // check if string has newline symbol
        if (this._buff.indexOf('\n') !== -1) {
            // push to stream skipping first line
            this.push(this._buff.slice(this._buff.indexOf('\n') + 1));
            // clear string buffer
            this._buff = null;
            // mark as removed
            this._removed = true;
        }
    }
    done();
};


function correctTricoFile(fileToConvert) {
    var fs = require('fs-extra'),
        LineByLineReader = require('line-by-line'),
        lr = new LineByLineReader(fileToConvert),
        errorCount = 0,
        //preLine = '',
        errorFlag = false,
        newLines = '',
        //firstPart = false,
        tempFile = syncTrico.destDir + '/new.csv';


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
        fs.appendFileSync(file, data);

    }

    function writeFile(file, data) {
        //var fs = require('fs');
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

}
