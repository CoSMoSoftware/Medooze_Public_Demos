const url = "wss://"+window.location.hostname+":"+window.location.port;
//Get our url
const href = new URL(window.location.href);
//Get id
const peerId = href.searchParams.get("peerId");

function start(peerId)
{
	//Connect with websocket
	const ws = new WebSocket(url+"?peerId="+peerId,"av1svc");
	
	//Crete transaction manager 
	const tm = new TransactionManager(ws);
	
	//Start on open
	ws.onopen = async ()=>{
		
		var old = document.querySelector ('.mdl-button--colored');
		var listener = function(event) 
		{
			//Get data
			var rid = event.target.dataset["rid"];
			var temporalLayerId = event.target.dataset["tid"];
			//Select simulcast layer
			tm.event("SELECT_LAYER",{
				rid		: rid,
				spatialLayerId	: 0,
				temporalLayerId	: temporalLayerId
			});
			//Remove
			event.target.classList.add("mdl-button--colored");
			old.classList.remove("mdl-button--colored");
			old = event.target;

		};
		var buttons = document.querySelectorAll('button');
		for (var i = 0; i < buttons.length; i++) 
			buttons[i].addEventListener("click",listener);
	};
}

//Start everything
window.onload=()=>{
	
	const dialog = document.querySelector("dialog");
	if (peerId)
	{
		//Check if component has already loaded
		if (dialog.querySelector("#peerId").parentElement.MaterialTextfield) 
			dialog.querySelector("#peerId").parentElement.MaterialTextfield.change(peerId);
		else 
			dialog.querySelector("#roomId").value = peerId;
		dialog.querySelector("#name").focus();
	}
	dialog.querySelector("form").addEventListener("submit", function(event) {
		dialog.close();
		start(url, this.roomId.value, this.name.value);
		event.preventDefault();
	});
	const dialog = document.querySelector("dialog");
	dialog.showModal();
	
	
};
