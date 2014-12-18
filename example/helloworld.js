var http = require('http');
var fs = require('fs');

var server = http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end(JSON.stringify(process.env));  
});

server.listen(3000);
console.log('Server running at http://127.0.0.1:3000/');
//fs.appendFileSync(log, 'Server running at http://127.0.0.1:3000/\n');

// Force the process to close after 15 seconds
setTimeout(function(){
	console.log('Timer hit limit');
  //console.log();
  //throw 'A test Error'
  //process.exit();
},25000);
