var amqp = require('amqplib');
var fs = require("fs");
var base64 = require('hi-base64');
var cdlib = require('../cd_lib/cd_lib');

var rabbitMQ = {
    'server': cdlib.getRabbitMQAddress(),
    'username': 'test',
    'password': 'test',
    'virtualHost': '/test',
    'queue': 'xls.to.csv'
}




var rabbitMQAuthString = 'amqp://' + rabbitMQ.username + ':' + rabbitMQ.password + '@' + rabbitMQ.server + rabbitMQ.virtualHost;

amqp.connect(rabbitMQAuthString).then(function(conn) {
  process.once('SIGINT', function() { conn.close(); });
  return conn.createChannel().then(function(ch) {

    var ok = ch.assertQueue(rabbitMQ.queue, {durable: true});

    ok = ok.then(function(_qok) {
      return ch.consume(rabbitMQ.queue, function(msg) {
        //console.log(" [x] Received '%s'", msg.content.toString());
          //console.log(" [x] Received ",msg.content.toString());
          //var pay = JSON.parse(msg.content);
          //console.log(JSON.parse(pay));
          var copy = JSON.parse(msg.content, function(key, value) {
                return value && value.type === 'Buffer'
                ? new Buffer(value.data)
            : value;
        });


          //console.log(copy.payload.toString());
        //
        //            var pay = JSON.parse(copy, function(key, value) {
        //        return value && value.type === 'Buffer'
        //        ? new Buffer(value.data)
        //    : value;
        //});

          console.log(copy.fileName);
          fs.writeFile("some.xlsx", copy.payload , function(error) {
     if (error) {
       console.error("write error:  " + error.message);
     } else {
       console.log("Successful Write to some.xls");
     }
});
      }, {noAck: true});
    });

    return ok.then(function(_consumeOk) {
      console.log(' [*] Waiting for messages. To exit press CTRL+C');
    });
  });
}).then(null, console.warn);
