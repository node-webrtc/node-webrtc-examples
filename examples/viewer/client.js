'use strict';

const createExample = require('../../lib/browser/example');

const description = 'View a broadcast. You should have already started the \
broadcast example. Although you can prototype such a system with  node-webrtc, \
you should consider using an \
<a href="https://webrtcglossary.com/sfu/" target="_blank">SFU</a>.';

const remoteVideo = document.createElement('video');
remoteVideo.autoplay = true;

async function beforeAnswer(peerConnection) {
  const remoteStream = new MediaStream(peerConnection.getReceivers().map(receiver => receiver.track));
  remoteVideo.srcObject = remoteStream;

  // NOTE(mroberts): This is a hack so that we can get a callback when the
  // RTCPeerConnection is closed. In the future, we can subscribe to
  // "connectionstatechange" events.
  const { close } = peerConnection;
  peerConnection.close = function() {
    remoteVideo.srcObject = null;
    return close.apply(this, arguments);
  };
}

createExample('viewer', description, { beforeAnswer });

const videos = document.createElement('div');
videos.className = 'grid';
videos.appendChild(remoteVideo);
document.body.appendChild(videos);
