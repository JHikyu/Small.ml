var express = require('express');
var app = express();
const http = require('http').Server(app);
const https = require('http');

http.listen(process.env.PORT || 3000, function() {
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





app.get('/', function(req, res) {
   res.render('index.ejs');
});
app.get('/:id', function(req, res) {
   // req.params.id => hi

   var link = db.get('links')
      .find({ short: req.params.id })
      .value()


   var date = moment().add(180, 'days').unix();


   if(link) {
      db.get('links')
         .find({ short: req.params.id })
         .set('expiry', date)
         .write()

      res.redirect(link.url);
   }
   else {
      res.render('505.ejs');
   }

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

         socket.emit('successfullyCreated', token)

      }
      else {
         console.log('Not a URI');
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
