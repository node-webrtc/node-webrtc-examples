'use strict';

function beforeOffer(peerConnection) {
  const dataChannel = peerConnection.createDataChannel('datachannel-buffer-limits');
  let uploadStartTime = 0;
  let uploadedBytesTotal = 0;
  let chunkSize = 64; // Default value, updated from the client

  function onMessage({ data }) {
    if (/^#START/.test(data)) {
      uploadStartTime = Date.now();
      const value = parseInt(data.split(' ')[1]);

      if (!isNaN(value)) {
        chunkSize = value;
      }

      return;
    }

    if (data === '#STOP') {
      const uploadDuration = Date.now() - uploadStartTime;

      console.log('Client upload duration :', uploadDuration, 'ms');
      console.log(`uploadedBytesTotal : ${uploadedBytesTotal}`);

      const queueStartTime = Date.now();
      const chunkSizeInBytes = chunkSize*1024;

      const loops = uploadedBytesTotal / chunkSizeInBytes;
      const rem = uploadedBytesTotal % chunkSizeInBytes;
      const obuf = new Array(chunkSizeInBytes + 1).join('.');

      try {
        dataChannel.send('#START ' + uploadDuration);

        for (let i = 0; i < loops; i++) {
          dataChannel.send(obuf);
        }

        if (rem) {
          dataChannel.send(obuf);
        }

        const queueDuration = Date.now() - queueStartTime;

        dataChannel.send('#STOP ' + queueDuration);
        console.log(`Data sent back to client, queueDuration : ${queueDuration} ms`)

      } catch(e) {
        console.log('Failed to send data :', e);
        dataChannel.removeEventListener('message', onMessage);
        dataChannel.close();
        peerConnection.close();
      }

      return;
    }

    uploadedBytesTotal += Buffer.byteLength(data);
  }

  function onConnectionStateChange(event) {
    switch(peerConnection.connectionState) {
      case "disconnected":
      case "failed":
      case "closed":
        console.log('Received close event');
        dataChannel.removeEventListener('message', onMessage);
        dataChannel.close();
        break;
    }
  }

  dataChannel.addEventListener('message', onMessage);
  peerConnection.addEventListener('connectionstatechange', onConnectionStateChange);
}

module.exports = { beforeOffer };
