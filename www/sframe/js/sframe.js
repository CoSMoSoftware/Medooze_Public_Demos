import {SFrame}	from "./sframe/Client.js";
import {Utils}	from "./sframe/lib/Utils.js";

const url = "wss://"+window.location.hostname+":"+window.location.port;

function addVideoForStream(stream,muted)
{
	//Create new video element
	const video = document.querySelector (muted ? "#local" : "#remote");
	//Set src stream
	video.srcObject = stream;
	//Set other properties
	video.autoplay = true;
	video.muted = muted;
	video.play();
}
function removeVideoForStream(stream)
{
	//Get video
	var video = document.getElementById(stream.id);
	//Remove it when done
	video.addEventListener('webkitTransitionEnd',function(){
            //Delete it
	    video.parentElement.removeChild(video);
        });
	//Disable it first
	video.className = "disabled";
}

async function connect() 
{
	const pc = new RTCPeerConnection({
		forceEncodedVideoInsertableStreams: true,
		forceEncodedAudioInsertableStreams: true,
		encodedInsertableStreams: true
	});
	
	//Get keys
	const shared = Utils.fromHex("12345678901234567890123456789012");
	const keyPair = await window.crypto.subtle.generateKey (
		{
			name: "ECDSA",
			namedCurve: "P-521"
		},
		true,
		["sign", "verify"]
	);
	
	const senderId = 0;
	//Create contexts
	const client = await SFrame.createClient(senderId);
	await client.setSenderEncryptionKey(shared);
	await client.setSenderSigningKey(keyPair.privateKey);
	await client.addReceiver(senderId);
	await client.setReceiverEncryptionKey(senderId, shared);
	await client.setReceiverVerifyKey(senderId, keyPair.publicKey);
	
	client.addEventListener("authenticated",event=>console.log("Authenticated receiver", event));
	
	const ws = new WebSocket(url,"sframe");
	
	pc.onaddstream = function(event) {
		console.debug("onAddStream",event);
		//Play it
		addVideoForStream(event.stream);

			
	};
	
	pc.ontrack = (event) => {
		//decyprt
		client.decrypt(event.transceiver.mid, event.receiver);
	};
	
	pc.onremovestream = function(event) {
		console.debug("onRemoveStream",event);
		//Play it
		removeVideoForStream(event.stream);
	};
	
	ws.onopen = async function(){
		console.log("opened");
		
		//Get local stream
		const localStream = await navigator.mediaDevices.getUserMedia({video:true});
		
		//Set it on the local video
		local.srcObject = localStream;
		local.play();
	
		try { 
			for (const track of localStream.getTracks())
			{
				//Add track
				const transceiver = pc.addTransceiver(track);
				//Encrypt it
				client.encrypt(transceiver.mid, transceiver.sender);
				
			}
			//Create offer
			const offer = await pc.createOffer();
			//Set it
			pc.setLocalDescription(offer);
			//Create room
			ws.send(JSON.stringify({
				cmd		: "OFFER",
				offer		: offer.sdp
			}));
		
		} catch(error) {
			console.error("Error",error);
			alert(error);
		};
	};
	
	ws.onmessage = function(event){
		console.log(event);
		
		//Get protocol message
		const msg = JSON.parse(event.data);
		
		console.log(msg.answer);
		pc.setRemoteDescription(new RTCSessionDescription({
				type:'answer',
				sdp: msg.answer
			}), function () {
				console.log("JOINED");
			}, function (err) {
				console.error("Error joining",err);
			}
		);
	};
}

var dialog = document.querySelector('dialog');
if (dialog.showModal)
{
	dialog.showModal();
	dialog.querySelector('.ready').addEventListener('click', function() {
		local.play();
		dialog.close();
		connect();
	});
} else {
	connect();
}





