var express = require('express');
var app = express();
const http = require('http').Server(app);
const https = require('http');

http.listen(3000, function() {
     console.log('listening on *:3000');
});

var moment = require('moment');
var randomToken = require('random-token').create('abcdefghijklmnopqrstuvwxzyABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');
var validUrl = require('valid-url');
const io = require('socket.io')(http);
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const adapter = new FileSync('db.json')
const db = low(adapter)
db.defaults({ links: [] })
   .write()

app.use(express.static('public'));

app.get('/uygh/:id', function(req, res) {
   // req.params.id
});



app.get('/asdf', function(req, res) {
   res.render('index.ejs');
});



io.on('connection', function(socket) {
   console.log('A user connected');
   socket.on('restart', (data) => {
      exit(1);
   })
   socket.on('disconnect', function () {
      console.log('A user disconnected');
   });



   socket.on('checkUrl', (value) => {

      if(validUrl.isUri(value)) {

         var token;
         var date = moment().add(180, 'days').unix();
         var inDB;
         var count = 0;

         do {
            count++
            token = randomToken(3);

            if(count >= 50)
               token = randomToken(4);
            if(count >= 100)
               token = randomToken(5);
            if(count >= 150)
               token = randomToken(6);

            inDB = db.get('links')
               .find({ short: token })
               .value()

         } while(inDB)



         db.get('links')
            .push({ url: value, short: token, expiry: date })
            .write()



      }
      else {
         console.log('Not a URI');
      }
   })



});
