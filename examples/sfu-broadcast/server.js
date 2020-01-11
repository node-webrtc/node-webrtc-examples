'use strict';

const { EventEmitter } = require('stream')

const { RTCAudioSource, RTCVideoSource, RTCAudioSink, RTCVideoSink } = require('wrtc').nonstandard;

let audioTrack, videoTrack;

const broadcastEvent = new EventEmitter()
const { on } = broadcastEvent;
broadcastEvent.on = function(event, callback) {
  /**
   * trigger event in case we already have a client that broadcast
   */
  if(event === 'newBroadcast' && audioTrack && videoTrack) {
    callback.apply(this, [{
      audioTrack,
      videoTrack
    }])
  }
  return on.apply(this, arguments);
}

function beforeOffer(peerConnection) {
  const videoSource = new RTCVideoSource();
  const audioSource = new RTCAudioSource();

  videoTrack = videoSource.createTrack();
  audioTrack = audioSource.createTrack();

  broadcastEvent.emit('newBroadcast', {
    audioTrack,
    videoTrack
  })

  const audioSink = new RTCAudioSink(peerConnection.addTransceiver('audio').receiver.track);
  const videoSink = new RTCVideoSink(peerConnection.addTransceiver('video').receiver.track);

  audioSink.addEventListener('data', function(data){
    audioSource.onData(data);
  })

  videoSink.addEventListener('frame', ({ frame })=>{
    videoSource.onFrame(frame);
  });
  
  const { close } = peerConnection;
  peerConnection.close = function() {
    audioSink.stop();
    videoSink.stop();
    videoTrack.stop()
    audioTrack.stop()
    return close.apply(this, arguments);
  };

}

module.exports = { 
  beforeOffer,
  event: broadcastEvent
 };
