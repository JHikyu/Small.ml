var express = require('express');
var app = express();
const http = require('http').Server(app);
const https = require('http');

http.listen(process.env.PORT || 80, function() {
     console.log('listening on *:80');
});


var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('data/data.db');
var Regex = require("regex");
var moment = require('moment');
var randomToken = require('random-token').create('abcdefghijklmnopqrstuvwxzyABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');
var validUrl = require('valid-url');
const io = require('socket.io')(http);





app.use(express.static('public'));





app.get('/', function(req, res) {
   db.all("SELECT COUNT(short) AS sum FROM links", [], (err, rows) => {
      res.render('index.ejs', { connections: connections, shorts: rows[0].sum, requests: requests });
   })

});
app.get('/api/:version/:one', function(req, res) {
   if(req.params.version == 'v1') {
      if(req.params.one == 'create') {
         if(!req.query.url) {
            res.send({ error: "url not specified" })
         } else {


            var regex = /^((ftp|http|https):\/\/)?www\.([A-z]+)\.([A-z]{2,})/

            if(regex.test(req.query.url)) {

               var expiryDays = req.query.expire || 180
               if(expiryDays > 180) {
                  res.send({ error: "max 180 days allowed" })
                  return
               }

               var token;
               var date = moment().add(expiryDays, 'days').unix();
               var inDB;
               token = randomToken(3);

               db.all("SELECT * FROM links WHERE short = '"+token+"'", [], (err, rows) => {
                  if(rows.length == 0) {
                     console.log(req.query.url);
                     db.run("INSERT INTO links (short, url, expiry, key) VALUES('"+token+"', '"+req.query.url+"', "+date+", '"+randomToken(6)+"');");
                     res.send({ short: token, expiry: date, url: req.query.url, complete_shorten_url: "http://www.small.ml/" + token, shorten_url: "small.ml/" + token })
                  }
                  else {
                     res.send({ error: "short already used" })
                  }
               })
               res.send({ error: "short already used" })

            }
            else {
               res.send({ error: "invalid url" })
            }
         }
      }

   }

})

app.get('/:id', function(req, res) {
   var date = moment().add(180, 'days').unix();

      db.all("SELECT * FROM links WHERE short = '"+req.params.id+"'", [], (err, rows) => {
         if(rows.length == 0) {
            res.render('505.ejs');
         }
         else {
            db.run("UPDATE links SET expiry = '"+date+"' WHERE short = '"+req.params.id+"'");
            setTimeout(function() {
               res.redirect(rows[0].url);
            }, 1)
         }
      })


      // db.get('links')
      //    .find({ short: req.params.id })
      //    .set('expiry', date)
      //    .write()

});


var connections = 0;
var requests = 0;
io.on('connection', function(socket) {
   connections++
   requests++

   console.log('A user connected');
   socket.on('restart', (data) => {
      exit(1);
   })
   socket.on('disconnect', function () {
      connections--
      console.log('A user disconnected');
   });



   socket.on('checkUrl', (value) => {

      var regex = /^((ftp|http|https):\/\/)?www\.([A-z]+)\.([A-z]{2,})/

      if(regex.test(value)) {

         var date = moment().add(180, 'days').unix();
         var inDB;
         var token = randomToken(3);

         db.run("INSERT INTO links (short, url, expiry, key) VALUES('"+token+"', '"+value+"', "+date+", '"+randomToken(6)+"');");

         socket.emit('successfullyCreated', token)

      }
      else {
         console.log('Not a URI1');
      }
   })



});






setInterval(function(){
   var date = moment().unix();
   db.run("DELETE FROM links WHERE expiry - " + date + " <= 0");
}, 2000)
