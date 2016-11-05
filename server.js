var express = require('express');
var app = express();
var path = require('path');
var multer = require('multer');
var fs = require('fs');
var uuid = require('uuid');
var jsmediatags = require("jsmediatags");
var btoa = require('btoa');
var cors = require('cors');
var server = require('http').createServer(app);
var io = require('socket.io')(server);

const DEV = process.env.DEV;
const PROD = process.env.PROD;

app.use(cors());
app.use(express.static(path.join(__dirname, '')));

var currentStreamingTrackId = '';
try {
    server.listen(90);
} catch (error) {
    console.log(error);
}


io.on('connection', (client)=> {
    client.on('streamTrack', (data)=> {
        console.log(data.url);
        
        stopStreaming();
        currentStreamingTrackId = data.id;
        
        fs.readFile('./'+data.url , function(err, data) {
            if(err) {
                throw err;
            }

            sendFirstStream(data.slice(0, data.length/2));
            
            setTimeout(function() {
                sendStreamUpdates(data.slice(data.length/2, data.length));
            }, 5000);
        });
    });
    
    function sendStreamUpdates(data) {
        client.emit('streamUpdates', data);
    }
    function sendFirstStream(data) {
        client.emit('streamStart', data);
    }
    client.on('disconnect', ()=> {
        console.log('disconnect request');
    });
    function getFirstSampleData() {
        
    }
    function stopStreaming() {

    }
})

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './user_data/songs/' + req.query.userId + '/');
    },
    filename: function (req, file, cb) {
        file.songId = uuid.v1();
        var extArray = file.originalname.split('.');
        cb(null, file.songId + '.' + extArray[extArray.length - 1]);
    }
});
var upload = multer({ storage: storage }).single('file');

app.get('/', function (req, res) {
    res.json({});
});

app.get('/song-stream', function() {
    var songId = req.query.songId;
});
app.post('/upload', function (req, res, next) {
    var userFolder = 'user_data/songs/' + req.query.userId;
    var imageFolder = 'user_data/thumbs/' + req.query.userId;
    if (!fs.existsSync(userFolder)){
        fs.mkdirSync(userFolder);
    }
    if (!fs.existsSync(imageFolder)){
        fs.mkdirSync(imageFolder);
    }
    upload(req, res, () => {
        jsmediatags.read(req.file.destination + req.file.filename, {
            onSuccess: (tags) =>{
                var tags = tags.tags;
                
                if(tags.picture) {
                    
                    var base64String = "";
                    for (var i = 0; i < tags.picture.data.length; i++) {
                        base64String += String.fromCharCode(tags.picture.data[i]);
                    }
                    var imageUrl = imageFolder + '/' +req.file.filename + '.' +tags.picture.format.split('/')[1];
                    dataUrl = btoa(base64String);
                    
                    require("fs").writeFile('./'+imageUrl , dataUrl, 'base64',  (err)=> {
                       
                        tags.thumbUrl = imageUrl;
                        tags.songUrl = userFolder + '/' + req.file.filename;
                        tags.songId = req.file.filename.split('.')[0];
                        tags.originalName = req.file.originalname;
                        tags.size = req.file.size;
                        
                        res.json(tags);
                    });
                } else {
                    tags.songUrl = userFolder + '/' + req.file.filename;
                    tags.thumbUrl = 'default-upload.png';
                    tags.songId = req.file.filename.split('.')[0];
                    tags.originalName = req.file.originalname;
                    tags.size = req.file.size;
                    res.json(tags);
                }
            },
            onError: (error)=> {
                res.json({message: error});
            }
        });
    })
});