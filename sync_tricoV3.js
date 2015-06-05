var fs = require('fs-extra');
var _ = require('lodash');
var moment =  require('moment');
var Promise = require("bluebird");
var base64 = require('hi-base64');

var cdlib = require('../cd_lib/cd_lib');

var rabbitMQ = {
    server: cdlib.getRabbitMQAddress(),
    username: 'test',
    password: 'test',
    virtualHost: '/test',
    queue: 'trico.file',
    msg: 'message not set',
    rabbitMQAuthString: function () {
        return 'amqp://' + this.username + ':' + this.password + '@' + this.server + this.virtualHost;
    }
}





var syncTrico = {
    srcDirProd: "\\\\ch01sf00\\groups$\\cis\\CITS Server Inventory\\Trico Export",
    srcDir: "test",
    'destDir': "dest",
    'destFile': "Trico.csv",
    'destFileXLS': "Trico.xls",
    'lastestSrc': null,
    'lastSec': 0,
    'latestSrcStats': null,
    'destFileStats': null,
    'srcList': null
};


// promise
var checkForFile =  function (syncTrico) {
    //return new Promise(function (resolve, reject) {

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

        fs.readFile(syncTrico.srcDir + "/" + syncTrico.latestSrc,  function (err,data) {
        if (err) {
            return console.log(err);
        }
            //console.log(data);
            //cdlib.sendRMQWorker(rabbitMQ, data);
            cdlib.rabbitMQ.routingKey = "xlstocsv";
            var pay = JSON.stringify(data);
            cdlib.rabbitMQ.publishTopic('{ "fileName": "test.name",  { "payload": ' + pay +  '}}');

            //cdlib.rabbitMQ.publishTopic(JSON.stringify(data));
            //cdlib.rabbitMQ.publishTopic(data);
            //convertXLS(data);
        })
    }
}



checkForFile(syncTrico);

var convertXLS =  function (fileStr) {

    var XLS = require('xlsjs'),
        //workbook = XLS.readFile(file),
        workbook = XLS.read(fileStr, {type:"binary"});
        sheet_name_list = workbook.SheetNames,
        Sheet1A1 = workbook.Sheets[sheet_name_list[0]]['A1'].v,
        csv = XLS.utils.sheet_to_csv(workbook.Sheets[sheet_name_list[0]]);
        console.log(csv);
}
