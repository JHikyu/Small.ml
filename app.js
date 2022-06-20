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

app.use(express.static('public'));

http.listen(process.env.PORT || 80, function () {
  console.log('listening on *:80');
});
https.listen(process.env.PORT || 443, function () {
  console.log('ssl listening on *:443');
});

var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('data/data.db');
var moment = require('moment');
var randomToken = require('random-token').create('abcdefghijklmnopqrstuvwxzyABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');
const io = require('socket.io')(https);

app2.get('*', function (req, res) {
  res.redirect("https://" + req.hostname + req.url)
})

app.get('/', function (req, res) {

  db.get("SELECT * FROM info", [], (err, row) => {
    db.run("UPDATE info SET requests = '" + (row.requests + 1) + "' WHERE requests = '" + row.requests + "'")
    requests = (row.requests + 1);
  })

  db.all("SELECT COUNT(short) AS sum, views AS views, sub AS sub FROM links", [], (err, count) => {
    db.all("SELECT views AS views, sub AS sub FROM links WHERE sub IS NOT NULL", [], (err, rows) => {
      allViews = {};
      rows.forEach((item, i) => {
        if (!allViews[item.sub]) allViews[item.sub] = 0;
        allViews[item.sub] += item.views;
      });

      res.render('index.ejs', { connections: connections, shorts: count[0].sum, requests: requests, partners: allViews });
    })
  })

})

app.get('/api/:version/:one', function (req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
  res.setHeader('Access-Control-Allow-Credentials', true);

  db.get("SELECT * FROM info", [], (err, row) => {
    db.run("UPDATE info SET requests = '" + (row.requests + 1) + "' WHERE requests = '" + row.requests + "'");
    requests = (row.requests + 1);
  })

  if (req.params.version == 'v1') {

    if (req.params.one == 'view') {
      if (!req.query.short) {
        res.send({ error: "short not specified" });
      } else {
        db.all("SELECT COUNT(short) AS sum, url AS url, expiry AS expiry FROM links WHERE short = '" + req.query.short + "'", [], (err, rows) => {
          if (rows[0].sum == 0) {
            res.send({ error: "short not created >> yet!" });
          }
          else {
            res.send({ url: rows[0].url, short: req.query.short, expiry: rows[0].expiry, views: rows[0].views });
          }
        })
      }
    }

    if (req.params.one == 'create') {
      if (!req.query.url) {
        res.send({ error: "url not specified" });
      } else {
        req.query.url = req.query.url.replace('compact.ml', '');

        var regex = /^((ftp|http|https):\/\/)?(www\.)?([A-z-0-9]+)\.([A-z]{2,})/;

        if (regex.test(req.query.url)) {

          var expiryDays = req.query.expire || 180;
          if (expiryDays > 180) {
            res.send({ error: "max 180 days allowed" });
            return
          }

          if (req.query.short) {
            if (req.query.sub != 'compact')
              var token = req.query.short;
            else if (req.query.short.length > 5)
              var token = req.query.short;
            else {
              res.send({ error: "custom short must have at least a length of 6" });
              return
            }
          }
          else {
            var token = randomToken(3)
          }
          var date = moment().add(expiryDays, 'days').unix()

          if (req.query.sub) {
            db.all("SELECT COUNT(short) AS sum FROM links WHERE short = '" + token + "' AND sub = '" + req.query.sub + "'", [], (err, rows) => {
              if (rows[0].sum == 0) {
                if (req.query.short) {
                  token = req.query.short;
                  db.run("INSERT INTO links (short, url, expiry, key, sub, views) VALUES('" + token + "', '" + req.query.url + "', " + date + ", '" + randomToken(6) + "', '" + req.query.sub + "', 0);");
                  res.send({ short: token, expiry: date, url: req.query.url, complete_shorten_url: "https://" + req.query.sub + ".compact.ml/" + token, shorten_url: req.query.sub + ".compact.ml/" + token });
                  console.log("New API usage: [create] short: " + req.query.short, ', url: ' + req.query.url, ', sub: ' + req.query.sub);
                }
                else {
                  res.send({ error: "no short specified" });
                }

              }
              else {
                res.send({ error: "short already used" });
              }
            })
          }
          else {
            db.all("SELECT COUNT(short) AS sum, short AS short FROM links WHERE url = '" + req.query.url + "'", [], (err, rows) => {
              if (rows[0].sum == 0) {
                db.all("SELECT COUNT(short) AS sum FROM links WHERE short = '" + token + "'", [], (errr, rowss) => {
                  if (rowss[0].sum != 0) {
                    token = randomToken(4);
                  }

                  db.run("INSERT INTO links (short, url, expiry, key, views) VALUES('" + token + "', '" + req.query.url + "', " + date + ", '" + randomToken(6) + "', 0);");
                  res.send({ short: token, expiry: date, url: req.query.url, complete_shorten_url: "https://compact.ml/" + token, shorten_url: "compact.ml/" + token });
                })

              }
              else {
                res.send({ short: rows[0].short, expiry: date, url: req.query.url, complete_shorten_url: "https://compact.ml/" + rows[0].short, shorten_url: "compact.ml/" + rows[0].short });
              }
            })
          }


        }
        else {
          res.send({ error: "invalid url" });
        }
      }
    }

    if (req.params.one == 'text') {
      token = randomToken(6);

      date = moment().add(1, 'hour').unix();

      db.run("INSERT INTO texts (short, text, expiry, key, views) VALUES('" + token + "', '" + req.query.text + "', " + date + ", '" + randomToken(6) + "', 0);");
      res.send({ short: token, expiry: date, text: req.query.text, complete_shorten_url: "https://compact.ml/" + token, shorten_url: "compact.ml/" + token });
    }

  }

})

app.get('/:id', function (req, res) {

  db.get("SELECT * FROM info", [], (err, row) => {
    db.run("UPDATE info SET requests = '" + (row.requests + 1) + "' WHERE requests = '" + row.requests + "'")
    requests = (row.requests + 1)
  })
  db.all("SELECT COUNT(short) AS sum FROM links", [], (err, rows) => {
    io.emit('bottomInfoDock', { connections: connections, requests: requests, shorts: rows[0].sum })
  })

  var date = moment().add(180, 'days').unix();

  // Subdomain
  subdomain = ("Subdomain: " + req.get('host') ? req.get('host').substring(0, req.get('host').lastIndexOf('.')) : null);
  subdomain = subdomain.replace('compact', '');
  if (subdomain) {
    subdomain = subdomain.split('.')[0]
    db.all("SELECT * FROM links WHERE short = '" + req.params.id + "' AND sub = '" + subdomain + "'", [], (err, rows) => {
      if (rows.length == 0) {
        res.render('index.ejs')
      }
      else {
        db.run("UPDATE links SET expiry = '" + date + "', views = '" + (rows[0].views + 1) + "' WHERE short = '" + req.params.id + "' AND sub = '" + subdomain + "'")

        res.redirect(rows[0].url)

        //res.render('redirect.ejs', { type: 'suburl', redirect: rows[0].url })
      }
    })
  }
  else {
    db.all("SELECT * FROM links WHERE short = '" + req.params.id + "'", [], (err, rows) => {
      if (rows.length == 0) {

        // try if its text
        db.all("SELECT * FROM texts WHERE short = '" + req.params.id + "'", [], (err, rows) => {
          if (rows.length == 0) {
            res.render('index.ejs');
          }
          else {
            res.send(rows[0].text);
          }
        })

      }
      else {
        db.run("UPDATE links SET expiry = '" + date + "', views = '" + (rows[0].views + 1) + "' WHERE short = '" + req.params.id + "'");
        res.render('redirect.ejs', { type: 'url', redirect: rows[0].url });
      }
    })
  }

})

var connections = 0;
var requests = 0;
io.on('connection', function (socket) {
  connections++

  db.all("SELECT COUNT(short) AS sum FROM links", [], (err, rows) => {
    io.emit('bottomInfoDock', { connections: connections, requests: requests, shorts: rows[0].sum })
  })

  console.log('A user connected')
  socket.on('disconnect', function () {
    connections--
    db.all("SELECT COUNT(short) AS sum FROM links", [], (err, rows) => {
      io.emit('bottomInfoDock', { connections: connections, requests: requests, shorts: rows[0].sum });
    })
    console.log('A user disconnected');
  });

  socket.on('checkUrl', (value) => {
    db.get("SELECT * FROM info", [], (err, row) => {
      db.run("UPDATE info SET requests = '" + (row.requests + 1) + "' WHERE requests = '" + row.requests + "'");
      requests = (row.requests + 1);
    })

    var regex = /^((ftp|http|https):\/\/)?(www\.)?([A-z-0-9]+)\.([A-z]{2,})/
    if (regex.test(value)) {
      var date = moment().add(180, 'days').unix();
      var token = randomToken(3);


      db.all("SELECT * FROM links WHERE url = '" + value + "'", [], (err, rows) => {
        if (rows.length == 0) {
          db.run("INSERT INTO links (short, url, expiry, key, views) VALUES('" + token + "', '" + value + "', " + date + ", '" + randomToken(6) + "', 0);");
          socket.emit('successfullyCreated', token);
        }
        else {
          socket.emit('successfullyCreated', rows[0].short);
        }

        db.all("SELECT COUNT(short) AS sum FROM links", [], (err, rows) => {
          io.emit('bottomInfoDock', { connections: connections, requests: requests, shorts: rows[0].sum });
        })
      })

    }
    else {
      console.log('Not a URI');
    }
  })

});

setInterval(function () {
  var date = moment().add(1, 'second').unix()

  db.get("SELECT * FROM texts ORDER BY expiry asc", [], (err, row) => {
    if (row) {
      db.run("DELETE FROM texts WHERE expiry - " + date + " <= 0")
    }
  })

  db.run("DELETE FROM links WHERE expiry - " + date + " <= 0")
}, 10000)
