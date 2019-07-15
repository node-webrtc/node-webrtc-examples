'use strict';

const createExample = require('../../lib/browser/example');

const description = 'This example sends a given amount of data from the client \
over an RTCDataChannel. Upon receipt, node-webrtc responds by sending the data \
back to the client. \
Data is chunked into pieces, you can adjust both the chunk size and global \
size to test the outbound buffer limits of the RTCDataChannel.';

const dataSize = document.createElement('input');
dataSize.type = 'number';
dataSize.value = 10;
dataSize.min = 1;
dataSize.max = 1024;

const chunkSize = document.createElement('input');
chunkSize.type = 'number';
chunkSize.value = 64;
chunkSize.step = 16;
chunkSize.min = 16;
chunkSize.max = 512;

function beforeAnswer(peerConnection) {
  let dataChannel = null;
  let downloadStartTime = 0;
  let downLoadDuration = 0;
  let downloadedBytes = 0;
  const uploadedBytes = (dataSize.value)*1024*1024;

  function closeDatachannel() {
    if (dataChannel) {
      dataChannel.removeEventListener('message', onMessage);
      dataChannel.close();
      dataChannel = null;
    }
  }

  function resetButtons() {
    document.querySelectorAll('button').forEach((button) => {
      if (button.innerText === 'Start') {
        button.disabled = false;
      }

      if (button.innerText === 'Stop') {
        button.disabled = true;
      }
    });
  }

  function onMessage({ data }) {
    if (/^#START/.test(data)) {
      downloadStartTime = Date.now();
      const uploadDuration = data.split(' ')[1];
      const uploadBitRate = uploadedBytes*8/(uploadDuration/1000)/1000000;
      const text = `Upload &emsp;&emsp;-- total : ${uploadedBytes}, duration : ${uploadDuration} ms, bitrate : ~${uploadBitRate.toFixed(2)} Mbits/s`;
      uploadLabel.innerHTML = text;
      console.log(text);

      return;
    }

    if (/^#STOP/.test(data)) {
      downLoadDuration = Date.now() - downloadStartTime;
      const downloadBitRate = downloadedBytes*8/(downLoadDuration/1000)/1000000;
      const text = `Download -- total : ${downloadedBytes}, duration : ${downLoadDuration} ms, bitrate : ~${downloadBitRate.toFixed(2)} Mbits/s`;
      downloadLabel.innerHTML = text;
      console.log(text);

      peerConnection.close();
      closeDatachannel();
      resetButtons();

      return;
    }

    downloadedBytes += data.length;
  }

  function onDataChannel({ channel }) {
    if (channel.label !== 'datachannel-buffer-limits') {
      return;
    }

    uploadLabel.innerHTML = 'Upload &emsp;&emsp;-- ...';
    downloadLabel.innerHTML = 'Download -- ...';

    // Slightly delaying everything because Firefox needs it
    setTimeout(() => {
      dataChannel = channel;
      dataChannel.addEventListener('message', onMessage);

      const queueStartTime = Date.now();
      const chunkSizeInBytes = (chunkSize.value)*1024;
      const loops = uploadedBytes / chunkSizeInBytes;
      const rem = uploadedBytes % chunkSizeInBytes;

      try {
        dataChannel.send(`#START ${chunkSize.value}`);

        var data = new Array(chunkSizeInBytes + 1).join('.');
        for (let i = 0; i < loops; i++) {
          dataChannel.send(data);
        }

        if (rem) {
          dataChannel.send(data);
        }

        dataChannel.send('#STOP');
        const queueDuration = Date.now() - queueStartTime;
        console.log(`Queued ${uploadedBytes} bytes in ${queueDuration} ms`);
      } catch(e) {
        console.log('Failed to send data over dataChannel :', e);
        peerConnection.close();
        closeDatachannel();
        resetButtons();
        alert(e);
      }
    }, 200);
  }

  function onConnectionStateChange(event) {
    switch(peerConnection.connectionState) {
      case "disconnected":
      case "failed":
      case "closed":
        console.log('Received close event');
        closeDatachannel();
        break;
    }
  }

  peerConnection.addEventListener('connectionstatechange', onConnectionStateChange);
  peerConnection.addEventListener('datachannel', onDataChannel);
}

createExample('datachannel-buffer-limits', description, { beforeAnswer, RTCPeerConnection: window.RTCPeerConnection });

const dataSizeLabel = document.createElement('label');
dataSizeLabel.innerText = 'Data size to send (MBytes):';
dataSizeLabel.appendChild(dataSize);

const chunkSizeLabel = document.createElement('label');
chunkSizeLabel.innerText = 'Chunk size (Kbytes):';
chunkSizeLabel.appendChild(chunkSize);

const uploadLabel = document.createElement('label');
uploadLabel.innerHTML = 'Upload &emsp;&emsp;-- ';

const downloadLabel = document.createElement('label');
downloadLabel.innerHTML = 'Download -- ';

document.body.appendChild(dataSizeLabel);
document.body.appendChild(chunkSizeLabel);
document.body.appendChild(uploadLabel);
document.body.appendChild(downloadLabel);
