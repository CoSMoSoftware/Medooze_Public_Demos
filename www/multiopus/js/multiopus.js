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

var sdp;
var pc;
var localStream;
	
function connect() 
{
	pc = new RTCPeerConnection(null);
	
	var ws = new WebSocket(url,"multiopus");
	
	pc.onaddstream = function(event) {
		var prev = 0;
		console.debug("onAddStream",event);
		//Play it
		addVideoForStream(event.stream);

			
	};
	
	pc.onremovestream = function(event) {
		console.debug("onRemoveStream",event);
		//Play it
		removeVideoForStream(event.stream);
	};
	
	ws.onopen = async function(){
		console.log("opened");
		
		
		//Local playback
		localStream = local.captureStream();
	
		try{ 
			for (const track of localStream.getTracks())
			{
				const transceiver = pc.addTransceiver(track);
				if (track.kind=="audio")
					transceiver.setCodecPreferences(RTCRtpSender.getCapabilities("audio").codecs.filter(codec=>codec.mimeType.includes("opus")));
			}
			//Create offer
			const offer = await pc.createOffer();
			console.debug("createOffer sucess",offer);
			offer.sdp = offer.sdp.replace("opus/48000/2","multiopus/48000/6").replace("useinbandfec=1", "useinbandfec=1; channel_mapping=0,4,1,2,3,5; num_streams=4; coupled_streams=2")
			//We have sdp
			sdp = offer.sdp;
			//Set it
			pc.setLocalDescription(offer);
			console.log(sdp);
			//Create room
			ws.send(JSON.stringify({
				cmd		: "OFFER",
				offer		: sdp
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





