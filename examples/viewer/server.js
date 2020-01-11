'use strict';

const { broadcaster } = require('../broadcaster/server')

function beforeOffer(peerConnection) {
  const audioTransceiver = peerConnection.addTransceiver('audio');
  const videoTransceiver = peerConnection.addTransceiver('video');
  
  function onNewBroadcast({ audioTrack, videoTrack }) {
    audioTransceiver.sender.replaceTrack(audioTrack),
    videoTransceiver.sender.replaceTrack(videoTrack) 
  }

  broadcaster.on('newBroadcast', onNewBroadcast)

  if (broadcaster.audioTrack && broadcaster.videoTrack) {
    onNewBroadcast(broadcaster);
  }

  const { close } = peerConnection;
  peerConnection.close = function() {
    broadcaster.removeListener('newBroadcast', onNewBroadcast);
    return close.apply(this, arguments);
  }
}

module.exports = { beforeOffer };
