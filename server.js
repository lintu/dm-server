var express = require('express');
var app = express();
var path = require('path');
var multer = require('multer');
var fs = require('fs');
var uuid = require('uuid');
var jsmediatags = require("jsmediatags");
var btoa = require('btoa');
var cors = require('cors');

const DEV = process.env.DEV;
const PROD = process.env.PROD;

app.use(cors());
app.use(express.static(path.join(__dirname, '')));

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
try {
    var server = app.listen(90, function () {
        var host = server.address().address;
        var port = server.address().port;
        console.log('Server on http: ', host, port);
    });
} catch (error) {
    console.log(error);
}
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