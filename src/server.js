const { join } = require('path');
const { statSync, createReadStream, readdirSync } = require("fs");
const express = require('express');
const app = express();

const videosFolder = join('/', 'Users', 'fcosta', 'Documents', 'Recordings');

const getVideos = () => {
    return readdirSync(videosFolder)
        .filter(video => !video.includes('.DS_Store') && !video.includes('tempAV'))
        .map(name => {
            const [date, hour, ...nameParts] = name.split(' ');
            const videoName = nameParts.join(' ').replace('.mp4', '');
            const createdAt = new Date(`${date} ${hour.replace('.', ':')}`);

            return {
                name: videoName,
                createdAt, 
                path: join('/', 'Users', 'fcosta', 'Documents', 'Recordings', name)
            };
        });
};

app.get('/', (_, res) => res.sendFile(join(__dirname, '..', 'public', 'index.html')));

app.get('/videos', (_, res) =>  res.json(getVideos().map((video, index) => ({ ...video, path: `/stream/${index}` }))));

app.get('/stream/:id',  (req, res) => {
    const range = req.headers.range;
    if (!range) {
        return res.status(400).send('Requires Range header');
    }
    const { id } = req.params;

    const videos = getVideos();
    const video = videos[id];

    if (!video) {
        return res.status(404).send('Video not found');
    }
  
    const videoSize = statSync(video.path).size;
  
    const CHUNK_SIZE = 10 ** 6;
    const start = Number(range.replace(/\D/g, ''));
    const end = Math.min(start + CHUNK_SIZE, videoSize - 1);
  
    const contentLength = end - start + 1;
    const headers = {
      'Content-Range': `bytes ${start}-${end}/${videoSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': contentLength,
      'Content-Type': 'video/mp4',
    };
  
    res.writeHead(206, headers);
  
    const videoStream = createReadStream(video.path, { start, end });
  
    videoStream.pipe(res);
});

app.listen(8000, ()  => console.log('Listening on port 8000!'));
