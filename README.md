# medooze-multiopus-demo
Demo application for multichannel opus loopback

## Intallation
```
npm install
```

## Run
You need to run the demo passing as argument the public IP address of the media server that will be included in the SDP. This IP address is the one facing your clients.
```
node index.js <ip>
```

The demo will open an HTPPS/WSS server at port 8000. 

To run this demo just open `https://ip:8000/` on latest Chrome version browser.




