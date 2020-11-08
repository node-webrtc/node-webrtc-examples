'use strict';

const { PassThrough } = require('stream')
const fs = require('fs')

const { RTCAudioSink, RTCVideoSink } = require('wrtc').nonstandard;

const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);
const { StreamInput } = require('fluent-ffmpeg-multistream')

const VIDEO_OUTPUT_SIZE = '320x240'
const VIDEO_OUTPUT_FILE = './recording.mp4'

let STREAM_ID = 0;

function beforeOffer(peerConnection) {
  const audioTransceiver = peerConnection.addTransceiver('audio');
  const videoTransceiver = peerConnection.addTransceiver('video');
  
  const audioSink = new RTCAudioSink(audioTransceiver.receiver.track);
  const videoSink = new RTCVideoSink(videoTransceiver.receiver.track);

  let idleSaveTimeout = null;
  let recordings = []
  let stream;

  videoSink.addEventListener('frame', ({ frame: { width, height, data }}) => {
    const size = width + 'x' + height;
    if (!stream || (stream && stream.size !== size)) {
      if(idleSaveTimeout){
         clearTimeout(idleSaveTimeout);
      }
      if (stream) {
        // Disconnect previous stream:
        if (stream.audio) {
          stream.audio.end();
        }
        stream.video.end();
        recordings.push(stream.recordPath);
      }

      // Create a new stream:
      stream = {
        id: STREAM_ID++,
        recordPath: './recording-' + size + '-' + STREAM_ID + '.mp4',
        size,
        video: new PassThrough(),
        audio: new PassThrough()
      };

      const onAudioData = ({ samples: { buffer } }) => {
        // If we've connected a new stream, then stream.id !== STREAM_ID
        if (stream.id === STREAM_ID) {
          stream.audio.push(Buffer.from(buffer));
        }
      };

      audioSink.addEventListener('data', onAudioData);

      stream.audio.on('end', () => {
        audioSink.removeEventListener('data', onAudioData);
      });
  
      stream.proc = ffmpeg()
        .addInput((new StreamInput(stream.video)).url)
        .addInputOptions([
          '-f', 'rawvideo',
          '-pix_fmt', 'yuv420p',
          '-s', stream.size,
          '-r', '30',
        ])
        .addInput((new StreamInput(stream.audio)).url)
        .addInputOptions([
          '-f s16le',
          '-ar 48k',
          '-ac 1',
        ])
        .on('start', ()=>{
          console.log('Start recording >> ', stream.recordPath)
        })
        .on('end', ()=>{
          console.log('Stop recording >> ', stream.recordPath)
        })
        .size(VIDEO_OUTPUT_SIZE)
        .output(stream.recordPath);

        stream.proc.run();
    }

    stream.video.push(Buffer.from(data));
  });

  const { close } = peerConnection;
  peerConnection.close = function() {
    audioSink.stop();
    videoSink.stop();
   
    // This should always be true, but just incase:
    if (stream && stream.id === STREAM_ID) {
      recordings.push(stream.recordPath);
      if (stream.audio) {
          stream.audio.end();
      }
      stream.video.end();
    }

    idleSaveTimeout = setTimeout(() => {
      const mergeProc = ffmpeg()
        .on('start', ()=>{
          console.log('Start merging into ' + VIDEO_OUTPUT_FILE);
        })
        .on('end', ()=>{
          recordings.forEach((recordPath)=>{
            fs.unlinkSync(recordPath);
          })
          recordings = [];
          console.log('Merge end. You can play ' + VIDEO_OUTPUT_FILE);
        });
        
      recordings.forEach((recordPath)=>{
        mergeProc.addInput(recordPath)
      });

      mergeProc
        .output(VIDEO_OUTPUT_FILE)
        .run();
    }, 1000)

    return close.apply(this, arguments);
  }
}

module.exports = { beforeOffer };
