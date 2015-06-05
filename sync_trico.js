var fs = require('fs-extra');
var _ = require('lodash');
var moment =  require('moment');

var syncTrico = {
    'srcDir': "\\\\ch01sf00\\groups$\\cis\\CITS Server Inventory\\Trico Export",
    'destDir': "D:/scripts/Servers",
    'destFile': "Trico.csv",
    'destFileXLS': "Trico.xls",
    'lastestSrc': null,
    'lastSec': 0,
    'latestSrcStats': null,
    'destFileStats': null,
    'srcList': null
};
getFile();
setInterval(function() {getFile();}, 10000);


function getFile() {

    syncTrico.destFileStats = fs.statSync(syncTrico.destDir + "/" + syncTrico.destFileXLS);
    syncTrico.srcList = fs.readdirSync(syncTrico.srcDir);

    _.each(syncTrico.srcList, function (f) {
        var stats = fs.statSync(syncTrico.srcDir + "/" + f);
        var mt = stats.mtime;
        var sec = moment(mt).unix();

        if (sec > syncTrico.lastSec) {
            syncTrico.lastSec = sec;
            syncTrico.latestSrc = f;
            syncTrico.latestSrcStats = stats;
        }
    });

    console.log(syncTrico.latestSrc);

    if (moment(syncTrico.destFileStats.mtime).unix() !== syncTrico.lastSec) {
        console.log("need to copy file");
        fs.copySync(syncTrico.srcDir + "/" + syncTrico.latestSrc, syncTrico.destDir + "/" + syncTrico.destFileXLS, {replace: true});
        fs.utimesSync(syncTrico.destDir + "/" + syncTrico.destFileXLS, syncTrico.latestSrcStats.atime, syncTrico.latestSrcStats.mtime);
        readFile(syncTrico.destDir + "/" + syncTrico.destFileXLS, syncTrico.destDir + "/" + syncTrico.destFile, function (done) { console.log("done");});
    } else {
        console.log("No need to copy file");
    }
}

function readFile(file, cvsFile, callback) {
    "use strict";
    console.log(file);

    var XLS = require('xlsjs'),
        workbook = XLS.readFile(file),
        sheet_name_list = workbook.SheetNames,
        Sheet1A1 = workbook.Sheets[sheet_name_list[0]]['A1'].v,
        csv = XLS.utils.sheet_to_csv(workbook.Sheets[sheet_name_list[0]]),
        LineByLineReader = require('line-by-line'),
        lineCnt = 0,
        newoutput = "";
        //lr = new LineByLineReader(cvsFile);


    fs.writeFile(cvsFile, csv, function (err) {
        if (err) {
            console.log(err);
        } else {
            console.log("The file was saved!");
            var input = fs.createReadStream(syncTrico.destDir + "/" + syncTrico.destFile); // read file
            var output = fs.createWriteStream(syncTrico.destDir + "/" + syncTrico.destFile + ".txt"); // write file

            input // take input
                .pipe(RemoveFirstLine()) // pipe through line remover
                .pipe(RemoveFirstLine()) // pipe through line remover
                .pipe(RemoveFirstLine()) // pipe through line remover
                .pipe(output); // save to file

            setTimeout(function () {
                fs.unlinkSync(syncTrico.destDir + "/" + syncTrico.destFile);
                fs.renameSync(syncTrico.destDir + "/" + syncTrico.destFile + ".txt", syncTrico.destDir + "/" + syncTrico.destFile);

            },5000);

        }
    });

/**
    lr.on('error', function (err) {

    // 'err' contains error object
    });

    lr.on('line', function (line) {
        lineCnt += 1;
        if (lineCnt > 3) {
            newoutput = newoutput + line + "\n";
        }
    // 'line' contains the current line without the trailing newline character.
    });

    lr.on('end', function () {
        //fs.unlinkSync(csvfile);
        fs.writeFile(cvsFile, newoutput, function (err) {
            if (err) {
                console.log(err);
            } else {
                console.log("The file was saved!");
                callback();
            }


        });

    // All lines are read, file is closed now.
    });
**/
}



var Transform = require('stream').Transform;
var util = require('util');


// Transform sctreamer to remove first line
function RemoveFirstLine(args) {
    if (! (this instanceof RemoveFirstLine)) {
        return new RemoveFirstLine(args);
    }
    Transform.call(this, args);
    this._buff = '';
    this._removed = false;
}
util.inherits(RemoveFirstLine, Transform);

RemoveFirstLine.prototype._transform = function(chunk, encoding, done) {
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



