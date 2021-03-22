var express = require('express');
var app = express();
const http = require('http').Server(app);
const https = require('http');

http.listen(3000, function() {
     console.log('listening on *:3000');
});

const io = require('socket.io')(http);
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const adapter = new FileSync('db.json')
const db = low(adapter)
db.defaults({ links: [] })
   .write()

app.use(express.static('public'));

app.get('/:id', function(req, res) {
   // req.params.id
});



io.on('connection', function(socket) {
   console.log('A user connected');
   socket.on('restart', (data) => {
      exit(1);
   })
   socket.on('disconnect', function () {
      console.log('A user disconnected');
   });
});
