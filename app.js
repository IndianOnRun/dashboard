var express = require('express')
  , app = express()
  , routes = require('./routes')
  // , user = require('./routes/user')
  , dashboard = require('./routes/dashboard')
  , http = require('http')
  , path = require('path')
  , port = 8080;

if (process.env.REDISTOGO_URL) {
  var rtg   = require("url").parse(process.env.REDISTOGO_URL);
  var redis = require("redis");
  var client = redis.createClient(rtg.port, rtg.hostname);
  client.auth(rtg.auth.split(":")[1]); 
} else {
  var redis = require('redis');
  var client = redis.createClient();
};

// Reset Redis counts
client.del("currentPageViews", function(err, reply){
  console.log("Reset Current Page Views to: " + reply);
});
client.del("totalPageViews", function(err, reply){
  console.log("Reset Total Page Views to: " + reply);
});

// Config app
var app = express();
app.configure(function(){
  app.set('port', process.env.PORT || port);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

// Routes
app.get('/', routes.index);
// app.get('/users', user.list);
app.get('/dashboard', dashboard.show);

var server = http.createServer(app);
var io = require('socket.io').listen(server);

// Configure socket
io.configure(function () {
  io.set("transports", ["xhr-polling"]); 
  io.set("polling duration", 10); 
  io.set('authorization', function (handshakeData, callback) {
    if (handshakeData.xdomain) {
      callback('Cross-domain connections are not allowed');
    } else {
      callback(null, true);
    }
  });
});

server.listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});

// Socket connections
io.sockets.on('connection', function(socket){
  client.get('currentPageViews', function(err, reply){
    console.log("Current page views: " + reply);
    io.sockets.emit('currentPageViews', { 'views': reply })
  });
  
  client.get('totalPageViews', function(err, reply){
    console.log("Total page views: " + reply);
    io.sockets.emit('totalPageViews', { 'views': reply })
  });

  // Unique event for index sockets
  socket.on('pageView', function(device){
    console.log("New socket: " + socket.id);

    client.incr('currentPageViews', function(err, reply){
      console.log("Current page views: " + reply);
      io.sockets.emit('currentPageViews', { 'views': reply });
    });

    client.incr('totalPageViews', function(err, reply){
      console.log("Total page views: " + reply);
      io.sockets.emit('totalPageViews', { 'views': reply });
    });

    client.hset('devices', socket.id, device.name, function(err, reply){
      console.log("Added " + device.name + " to devices");
    });
  });

  // If device present in devices hash,
  // removes device from devices and  
  // decrements current page views
  socket.on('disconnect', function(){
    console.log("Socket " + socket.id + " disconnected");

    client.hdel('devices', socket.id, function(err, reply){
      console.log("Reply on device disconnect was: " + reply);
      console.log("Removed " + socket.id + " from devices");

      if (reply != 0){
        client.decr("currentPageViews", function(err, views){
          console.log("Decremented current page views to " + views);
          io.sockets.emit('currentPageViews', { 'views': views });
        });
      }
    });
  });
});









