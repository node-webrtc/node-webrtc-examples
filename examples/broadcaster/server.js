'use strict';

const { EventEmitter } = require('events');

const broadcaster = new EventEmitter();
const { on } = broadcaster;

function beforeOffer(peerConnection) {
  const audioTrack = broadcaster.audioTrack = peerConnection.addTransceiver('audio').receiver.track;
  const videoTrack = broadcaster.videoTrack = peerConnection.addTransceiver('video').receiver.track;

  broadcaster.emit('newBroadcast', {
    audioTrack,
    videoTrack
  });

  const { close } = peerConnection;
  peerConnection.close = function() {
    audioTrack.stop()
    videoTrack.stop()
    return close.apply(this, arguments);
  };
}

module.exports = { 
  beforeOffer,
  broadcaster
};
