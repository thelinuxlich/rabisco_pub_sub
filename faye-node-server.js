var http = require('http'),
    Faye = require('./faye/faye-node');

var fayeServer = new Faye.NodeAdapter({
  mount:    '/faye',
  timeout:  45
});

var httpServer = http.createServer(function(request, response) {
  if (fayeServer.call(request, response)) return;
  response.writeHead(200, {'Content-Type': 'text/plain'});
  response.write('Hello, non-Faye request');
  response.end();
});

httpServer.listen(8000);
