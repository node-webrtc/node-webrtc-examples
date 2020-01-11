'use strict';

const { event } = require('../sfu-broadcast/server')

function beforeOffer(peerConnection) {
  const audioTransceiver = peerConnection.addTransceiver('audio');
  const videoTransceiver = peerConnection.addTransceiver('video');
  
  const onNewBroadcast = ({ audioTrack, videoTrack })=>{
    audioTransceiver.sender.replaceTrack(audioTrack),
    videoTransceiver.sender.replaceTrack(videoTrack) 
  };

  event.on('newBroadcast', onNewBroadcast)

  const { close } = peerConnection;
  peerConnection.close = function() {
    event.removeListener('newBroadcast', onNewBroadcast);
    return close.apply(this, arguments);
  }
}

module.exports = { beforeOffer };
