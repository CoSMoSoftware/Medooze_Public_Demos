// Copyright (C) 2017~2021  Sergio Murillo @ CoSMo Software
// see LICENSE.txt

const http = require ('http');
const url = require ('url');

const TransactionManager = require("transaction-manager");
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

let endpoint;
const clients = new Map();

module.exports = 
{
	init	: function(e) {
		endpoint = e;
	},
	handler	: function(request,protocol)
	{
		//Get id
		const peerId = parseInt(request.resourceURL.query.peerId);
			
		//Get client
		const client = clients.get(peerId);
		
		//If not found
		if (!client)
			return request.reject(404);
		
		//Accept connection
		const connection = request.accept(protocol);

		//Create new transaction manager
		const tm = new TransactionManager(connection);

		tm.on("event",(event)=>{
			const name = event.name;
			const data = event.data;
			//Check event name
			if (name=="SELECT_LAYER")
				//Select layer
				client.selectLayer(parseInt(data.spatialLayerId),parseInt(data.temporalLayerId));
		});
		
		//The stats timer
		const timer = setInterval(()=>{
			try {
				tm.event("stats",client.getStats())
			} catch(e){
				 clearInterval(timer);
			}
		},1000);
		
		connection.on("close",()=>{
			clearInterval(timer);
		});
	}
};

const Capabilities = {
	audio : {
		codecs		: ["opus"],
	},
	video : {
		codecs		: ["AV1;level-idx=5;profile=0"],
		rtx		: true,
		rtcpfbs		: [
			{ "id": "goog-remb"},
			{ "id": "transport-cc"},
			{ "id": "ccm", "params": ["fir"]},
			{ "id": "nack"},
			{ "id": "nack", "params": ["pli"]}
			
		],
		extensions	: [
			"https://aomediacodec.github.io/av1-rtp-spec/#dependency-descriptor-rtp-header-extension",
			"urn:3gpp:video-orientation",
			"http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01",
			"http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time",
			"urn:ietf:params:rtp-hdrext:sdes:repaired-rtp-stream-id",
			"urn:ietf:params:rtp-hdrext:sdes:rtp-stream-id",
			"urn:ietf:params:rtp-hdrext:sdes:mid"
		],
		simulcast	: true
	}
};

class Client
{
	constructor(id)
	{
		this.id = id;
	}
	
	start(offer)
	{
		//Create an DTLS ICE transport in that enpoint
		this.transport = endpoint.createTransport({
			dtls : offer.getDTLS(),
			ice  : offer.getICE() 
		});

		//Set RTP remote properties
		this.transport.setRemoteProperties({
			audio : offer.getMedia("audio"),
			video : offer.getMedia("video")
		});

		//Create local SDP info
		const answer = offer.answer({
			dtls		: this.transport.getLocalDTLSInfo(),
			ice		: this.transport.getLocalICEInfo(),
			candidates	: endpoint.getLocalCandidates(),
			capabilities	: Capabilities
		});

		//Set RTP local  properties
		this.transport.setLocalProperties({
			audio : answer.getMedia("audio"),
			video : answer.getMedia("video")
		});

		//For each stream offered
		let offered = offer.getFirstStream();
		
		//Create the remote stream into the transport
		this.incomingStream = this.transport.createIncomingStream(offered);

		//Create new local stream with only audio
		this.outgoingStream  = this.transport.createOutgoingStream({
			audio: false,
			video: true
		});

		//Get local stream info
		const info = this.outgoingStream.getStreamInfo();

		//Copy incoming data from the remote stream to the local one
		this.transponder = this.outgoingStream.attachTo(this.incomingStream);

		//Add local stream info it to the answer
		answer.addStream(info);

		//Done
		return answer;

	}
	
	selectLayer(spatialLayerId,temporalLayerId)
	{
		this.transponder[0].selectLayer(parseInt(spatialLayerId),parseInt(temporalLayerId));
	}
	
	getStats()
	{
		return {
			ts : Date.now(),
			incoming : this.incomingStream ? this.incomingStream.getVideoTracks()[0].getStats() : null,
			outgoing : this.outgoingStream ? this.outgoingStream.getVideoTracks()[0].getStats() : null,
		};
	}
	stop()
	{
		this.transport && this.transport.stop();
	}
}

let max = 2;
//Create HTTP server
const httpserver = http.createServer ((req, res) => {
	// parse URL
	const parsedUrl = url.parse (req.url);
	const searchParams = new url.URLSearchParams(parsedUrl.search);
	
	//get peer id
	const peerId = parseInt(searchParams.get("peer_id"));

	console.log(parsedUrl.pathname,parsedUrl.search,peerId);
	
	switch(parsedUrl.pathname)
	{
		case "/sign_in":
		{
			//Create new client
			const id = max++;
			//Create new client
			clients.set(id,new Client(id));
			//Return list of peers
			const peers = "AV1 SVC demo server - your id is:"+id+",1,1\n";
			res.setHeader ('Pragma',String(id));
			res.setHeader ('Content-Type','text/plain');
			res.setHeader ('Content-Length',peers.length);
			res.end(peers);
			break;
		}
		case "/message":
		{
			//Get client
			const client = clients.get(peerId);
		
			//If not found
			if (!client)
				//End now
				return res.end();
			
			//Get body
			var body = [];
			//Read data
			req.on('error', function(err) {
				 console.error(err);
			}).on('data', function(chunk) {
				body.push(chunk);
			}).on('end', function() {
				//Get body
				const str = Buffer.concat(body).toString();
				//Check if end
				if (str=="BYE")
					return client.stop();
				//Get string message
				var msg = JSON.parse(str);
			
				//If it is the offer
				if (msg.type==="offer")
				{

					console.log("OFFER:\n",msg.sdp);
					//Process the sdp
					var offer = SDPInfo.process(msg.sdp.replace("AV1X","AV1"));
					
					//Do offer/anseer
					const answer = client.start(offer);
					
					const str = answer.toString().replace("AV1","AV1X")
					console.log("ANSWER:\n",str);
					
					setTimeout(()=>{
						console.log("answer");
						//Crate response
						var response = JSON.stringify ({
							type: "answer",
							sdp: str
						});
						client.waiting.setHeader ('Pragma','1');
						client.waiting.setHeader ('Content-Type','text/plain');
						client.waiting.setHeader ('Content-Length',response.length);
						client.waiting.end(response);
					},1000);
				} 
				//Done
				res.setHeader ('Pragma',String(peerId));
				res.setHeader ('Content-Length',0);
				res.end();
			});
			break;
		}
		case "/wait":
		{
			//Get client
			const client = clients.get(peerId);
			//If not found
			if (!client)
				//End now
				return res.end();
			//Set waiting response
			client.waiting = res;
			break;
		}
		case "/sign_out":
		{
			//Get client
			const client = clients.get(peerId);
			//If not found
			if (!client)
				//End now
				return res.end();
			//Terminate client
			client.stop();
			//Delete client
			clients.delete(peerId);
			break;
		}
	}
}).listen (8888);
