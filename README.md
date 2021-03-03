# CoSMo's Medooze Proof of Concept and Demos

This repository contains code to present novel APIs and features as they become available.

It is not suitable for productions. This is not the version used in production in Millicast or other cosmo / medooze product, those are minimum viable implementation for people to learn from. It is always easier to start from something that works, right :-)

A main page direct you to the demo if interest:
- Demo App for WebRTC Surround sound (multichannel opus) in chrome
- Demo App for Face recognition and surrounding masking with Isnertable Stream API (Inspired by Around)
- Demo App for Naive SFrame implementation (E2EE) in chrome.
- Demo App for AV1 SVC modes supports. Requires a modified peer-connection native app that can be found here.

## Intallation

All demos are installed together.

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
