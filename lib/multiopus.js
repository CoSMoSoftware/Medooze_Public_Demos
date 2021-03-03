// Copyright (C) 2017~2021  Sergio Murillo @ CoSMo Software
// see LICENSE.txt

//Get the Medooze Media Server interface
const MediaServer = require("medooze-media-server");

//Get Semantic SDP objects
const SemanticSDP	= require("semantic-sdp");
const SDPInfo		= SemanticSDP.SDPInfo;
const MediaInfo		= SemanticSDP.MediaInfo;
const CandidateInfo	= SemanticSDP.CandidateInfo;
const DTLSInfo		= SemanticSDP.DTLSInfo;
const ICEInfo		= SemanticSDP.ICEInfo;
const StreamInfo	= SemanticSDP.StreamInfo;
const TrackInfo		= SemanticSDP.TrackInfo;
const Direction		= SemanticSDP.Direction;
const CodecInfo		= SemanticSDP.CodecInfo;

const Capabilities = {
	audio : {
		codecs		: ["multiopus"],
	},
	video : {
		codecs		: ["vp9"],//"h264;packetization-mode=1"
		rtx		: true,
		rtcpfbs		: [
			{ "id": "goog-remb"},
			{ "id": "transport-cc"},
			{ "id": "ccm", "params": ["fir"]},
			{ "id": "nack"},
			{ "id": "nack", "params": ["pli"]}
		],
		extensions	: [
			"http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01",
			"http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time"
		]
	}
};

module.exports = function(request,protocol,endpoint)
{
	const connection = request.accept(protocol);
			
	connection.on('message', (frame) =>
	{
		//Get cmd
		var msg = JSON.parse(frame.utf8Data);

		//Get cmd
		if (msg.cmd==="OFFER")
		{
			console.log(msg.offer);
			//Process the sdp
			var offer = SDPInfo.process(msg.offer);
		
			//Create an DTLS ICE transport in that enpoint
			const transport = endpoint.createTransport(offer);
		
			//Set RTP remote properties
			transport.setRemoteProperties(offer);
			
			//Create local SDP info
			const answer = offer.answer({
				dtls		: transport.getLocalDTLSInfo(),
				ice		: transport.getLocalICEInfo(),
				candidates	: endpoint.getLocalCandidates(),
				capabilities	: Capabilities
			});

			//Set RTP local  properties
			transport.setLocalProperties(answer);

			//For each stream offered
			for (let offered of offer.getStreams().values())
			{
				//Create the remote stream into the transport
				const incomingStream = transport.createIncomingStream(offered);
				
				//Create new local stream with only audio
				const outgoingStream  = transport.createOutgoingStream({
					audio: true,
					video: true
				});

				//Get local stream info
				const info = outgoingStream.getStreamInfo();

				//Copy incoming data from the remote stream to the local one
				outgoingStream.attachTo(incomingStream);

				//Add local stream info it to the answer
				answer.addStream(info);

			}

			//Send response
			connection.sendUTF(JSON.stringify({
				answer : answer.toString()
			}));
			
			//Close on disconnect
			connection.on("close",() => {
				console.log("close");
				//Stop
				transport && transport.stop();
			});
		}	
	});
};
