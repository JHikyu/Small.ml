var express = require('express');
var app = express();
var app2 = express();
const fs = require('fs');
const ssl_options = {
   key: fs.readFileSync('privkey.pem'),
   cert: fs.readFileSync('cert.pem')
};
const http = require('http').Server(app2);
const https = require('https').Server(ssl_options, app)

http.listen(process.env.PORT || 80, function() {
     console.log('listening on *:80');
});
https.listen(process.env.PORT || 443, function() {
     console.log('ssl listening on *:443');
});



var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('data/data.db');
var moment = require('moment');
var randomToken = require('random-token').create('abcdefghijklmnopqrstuvwxzyABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');
const io = require('socket.io')(https);


app.use(express.static('public'));



app2.get('*', function(req, res){
   res.redirect("https://"+req.hostname+req.url)
})


app.get('/', function(req, res) {
   db.all("SELECT COUNT(short) AS sum FROM links", [], (err, rows) => {
      res.render('index.ejs', { connections: connections, shorts: rows[0].sum, requests: requests })
   })
})

app.get('/api/:version/:one', function(req, res) {
   db.get("SELECT * FROM info", [], (err, row) => {
      db.run("UPDATE info SET requests = '"+(row.requests+1)+"' WHERE requests = '"+row.requests+"'")
      requests = (row.requests+1)
   })

   if(req.params.version == 'v1') {

      if(req.params.one == 'view') {
         if(!req.query.short) {
            res.send({ error: "short not specified" })
         } else {
            db.all("SELECT COUNT(short) AS sum, url AS url, expiry AS expiry FROM links WHERE short = '"+req.query.short+"'", [], (err, rows) => {
               if(rows[0].sum == 0) {
                  res.send({ error: "short not created >> yet!" })
               }
               else {
                  res.send({ url: rows[0].url, short: req.query.short, expiry: rows[0].expiry })
               }
            })
         }
      }

      if(req.params.one == 'create') {
         if(!req.query.url) {
            res.send({ error: "url not specified" })
         } else {
            req.query.url = req.query.url.replace('small.ml', '')

            var regex = /^((ftp|http|https):\/\/)?(www\.)?([A-z]+)\.([A-z]{2,})/

            if(regex.test(req.query.url)) {

               var expiryDays = req.query.expire || 180
               if(expiryDays > 180) {
                  res.send({ error: "max 180 days allowed" })
                  return
               }

               if(req.query.short) {
                  if(req.query.short.length > 5)
                     var token = req.query.short
                  else {
                     res.send({ error: "custom short must have at least a length of 6" })
                     return
                  }
               }
               else {
                  var token = randomToken(3)
               }
               var date = moment().add(expiryDays, 'days').unix()
               var inDB

               db.all("SELECT COUNT(short) AS sum FROM links WHERE short = '"+token+"'", [], (err, rows) => {
                  if(rows[0].sum == 0) {
                     console.log(req.query.url)
                     db.run("INSERT INTO links (short, url, expiry, key) VALUES('"+token+"', '"+req.query.url+"', "+date+", '"+randomToken(6)+"');")
                     res.send({ short: token, expiry: date, url: req.query.url, complete_shorten_url: "http://www.small.ml/" + token, shorten_url: "small.ml/" + token })
                     console.log("New API usage: [create] short: " + req.query.short, ', url: ' + req.query.url);
                  }
                  else {
                     res.send({ error: "short already used" })
                  }
               })

            }
            else {
               res.send({ error: "invalid url" })
            }
         }
      }

   }

})

app.get('/:id', function(req, res) {

   db.get("SELECT * FROM info", [], (err, row) => {
      db.run("UPDATE info SET requests = '"+(row.requests+1)+"' WHERE requests = '"+row.requests+"'")
      requests = (row.requests+1)
   })


   db.all("SELECT COUNT(short) AS sum FROM links", [], (err, rows) => {
      io.emit('bottomInfoDock', {connections: connections, requests: requests, shorts: rows[0].sum})
   })

   var date = moment().add(180, 'days').unix()

      db.all("SELECT * FROM links WHERE short = '"+req.params.id+"'", [], (err, rows) => {
         if(rows.length == 0) {
            res.render('505.ejs')
         }
         else {
            db.run("UPDATE links SET expiry = '"+date+"' WHERE short = '"+req.params.id+"'")
            setTimeout(function() {
               res.redirect(rows[0].url)
            }, 1)
         }
      })
})

var connections = 0;
var requests = 0;
io.on('connection', function(socket) {
   connections++

   db.all("SELECT COUNT(short) AS sum FROM links", [], (err, rows) => {
      io.emit('bottomInfoDock', {connections: connections, requests: requests, shorts: rows[0].sum})
   })


   console.log('A user connected')
   // socket.on('restart', (data) => {
   //    exit(1)
   // })
   socket.on('disconnect', function () {
      connections--
      db.all("SELECT COUNT(short) AS sum FROM links", [], (err, rows) => {
         io.emit('bottomInfoDock', {connections: connections, requests: requests, shorts: rows[0].sum})
      })
      console.log('A user disconnected');
   });



   socket.on('checkUrl', (value) => {
      db.get("SELECT * FROM info", [], (err, row) => {
         db.run("UPDATE info SET requests = '"+(row.requests+1)+"' WHERE requests = '"+row.requests+"'")
         requests = (row.requests+1)
      })

      var regex = /^((ftp|http|https):\/\/)?(www\.)?([A-z]+)\.([A-z]{2,})/

      if(regex.test(value)) {

         var date = moment().add(180, 'days').unix()
         var inDB
         var token = randomToken(3)


         db.all("SELECT * FROM links WHERE url = '"+value+"'", [], (err, rows) => {
            if(rows.length == 0) {
               db.run("INSERT INTO links (short, url, expiry, key) VALUES('"+token+"', '"+value+"', "+date+", '"+randomToken(6)+"');")
               socket.emit('successfullyCreated', token)
            }
            else {
               socket.emit('successfullyCreated', rows[0].short)
            }

            db.all("SELECT COUNT(short) AS sum FROM links", [], (err, rows) => {
               io.emit('bottomInfoDock', {connections: connections, requests: requests, shorts: rows[0].sum})
            })
         })

      }
      else {
         console.log('Not a URI')
      }
   })



});

setInterval(function(){
   var date = moment().unix()
   db.run("DELETE FROM links WHERE expiry - " + date + " <= 0")
}, 10000)
