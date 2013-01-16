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

  socket.on('pageView', function(device){
    client.incr('currentPageViews', function(err, reply){
      console.log("Incremented current page views: " + reply);
      io.sockets.emit('currentPageViews', { 'views': reply })
    });
    client.incr('totalPageViews', function(err, reply){
      console.log("Total page views: " + reply);
      io.sockets.emit('totalPageViews', { 'views': reply })
    });
    console.log(device.name)
  });

  // this is decrementing even when the dashboard disconnects
  socket.on('disconnect', function(){
    client.decr("currentPageViews", function(err, reply){
      console.log("Decremented current page views: " + reply);
      io.sockets.emit('currentPageViews', { 'views': reply })
    });
  });
});









