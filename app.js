var express = require('express');
var app = express();
const http = require('http').Server(app);
const https = require('http');

http.listen(process.env.PORT || 80, function() {
     console.log('listening on *:80');
});


var Regex = require("regex");
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





app.get('/', function(req, res) {
   var shorts = db.get('links')
      .size()
      .value()

   res.render('index.ejs', { connections: connections, shorts: shorts, requests: requests });
});
app.get('/api/:version/:one', function(req, res) {
   if(req.params.version == 'v1') {
      if(req.params.one == 'create') {
         if(!req.query.url) {
            res.send({ error: "url not specified" })
         } else {


            var regex = /^((ftp|http|https):\/\/)?www\.([A-z]+)\.([A-z]{2,})/

            if(regex.test(value)) {

               var expiryDays = req.query.expire || 180
               if(expiryDays > 180) {
                  res.send({ error: "max 180 days allowed" })
                  return
               }

               var token;
               var date = moment().add(expiryDays, 'days').unix();
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
                  .push({ url: req.query.url, short: token, expiry: date })
                  .write()

               res.send({ short: token, expiry: date, url: req.query.url, complete_shorten_url: "http://www.small.ml/" + token, shorten_url: "small.ml/" + token })

            }
            else {
               res.send({ error: "invalid url" })
            }
         }
      }

   }

})

app.get('/:id', function(req, res) {

   var link = db.get('links')
      .find({ short: req.params.id })
      .value()


   var date = moment().add(180, 'days').unix();


   if(link) {
      db.get('links')
         .find({ short: req.params.id })
         .set('expiry', date)
         .write()

      setTimeout(function() {
         res.redirect(link.url);
      }, 1)
   }
   else {
      res.render('505.ejs');
   }

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

         socket.emit('successfullyCreated', token)

      }
      else {
         console.log('Not a URI1');
      }
   })



});






setInterval(function(){
   var links = db.get('links')
      .sortBy('expiry')
      .take(1)
      .value()
   links = links[0]
   var date = moment().unix();

   if(links.expiry - date <= 0) {
      var links = db.get('links')
         .remove({ short: links.short })
         .write()
   }
}, 2000)
