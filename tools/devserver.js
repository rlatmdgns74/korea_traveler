// appFolder/assets/public 를 브라우저로 확인하기 위한 개발용 정적 서버 (의존성 없음)
//   node tools/devserver.js
//   http://localhost:5179 → dev 모드,  http://localhost:5180 → user 모드
// index.html 의 BUILD_MODE 줄은 응답할 때만 바꿔서 보낸다 (파일은 그대로).
var http = require("http"), fs = require("fs"), path = require("path");
var ROOT = path.resolve(__dirname, "../appFolder/assets/public");
var PORTS = { dev: Number(process.env.DEV_PORT) || 5179, user: Number(process.env.USER_PORT) || 5180 };
var TYPES = { ".html":"text/html; charset=utf-8", ".js":"text/javascript; charset=utf-8", ".json":"application/json", ".css":"text/css", ".png":"image/png", ".svg":"image/svg+xml" };

function serve(mode){
  return function(req, res){
    var p = decodeURIComponent(req.url.split("?")[0]);
    if (p === "/") p = "/index.html";
    var file = path.join(ROOT, p);
    if (file.indexOf(ROOT) !== 0){ res.writeHead(403); return res.end(); }
    fs.readFile(file, function(err, buf){
      if (err){ res.writeHead(404); return res.end("not found"); }
      if (p === "/index.html"){
        buf = Buffer.from(String(buf).replace(/var BUILD_MODE = "[a-z]*";/, 'var BUILD_MODE = "' + mode + '";'));
      }
      res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
      res.end(buf);
    });
  };
}
Object.keys(PORTS).forEach(function(mode){
  http.createServer(serve(mode)).listen(PORTS[mode], "127.0.0.1", function(){
    console.log(mode + " → http://localhost:" + PORTS[mode]);
  });
});
