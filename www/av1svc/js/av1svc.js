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
	
	//Clear stats
	const charts = {
		incoming: {
			chart : new SmoothieChart ({
				millisPerPixel: 48,
				grid: {
					millisPerLine: 2000,
					verticalSections: 3
				},
				labels: {
					showIntermediateLabels : true,
				},
				tooltip: true,
				minValue: 0,
				maxValueScale: 1.1,
			}),
			canvas :  document.querySelector('#incoming-chart canvas'),
			series : [ new TimeSeries(),new TimeSeries(),new TimeSeries(), new TimeSeries(),
				   new TimeSeries(),new TimeSeries(),new TimeSeries(), new TimeSeries(),
				   new TimeSeries(),new TimeSeries(),new TimeSeries(), new TimeSeries()
			]
		},
		outgoing: {
			chart : new SmoothieChart ({
				millisPerPixel: 48,
				grid: {
					millisPerLine: 2000,
					verticalSections: 3
				},
				labels: {
					showIntermediateLabels : true,
				},
				tooltip: true,
				minValue: 0,
				maxValueScale: 1.1,
			}),
			canvas :  document.querySelector('#outgoing-chart canvas'),
			series : [ new TimeSeries()]
			
		}
	};
	
	//Start incoming chart
	charts["incoming"].chart.addTimeSeries(charts["incoming"].series[0], {lineWidth: 2, strokeStyle: '#defffcff'});
	charts["incoming"].chart.addTimeSeries(charts["incoming"].series[1], {lineWidth: 2, strokeStyle: '#e2e4f6ff'});
	charts["incoming"].chart.addTimeSeries(charts["incoming"].series[2], {lineWidth: 2, strokeStyle: '#e7c8ddff'});
	charts["incoming"].chart.addTimeSeries(charts["incoming"].series[3], {lineWidth: 2, strokeStyle: '#dbafc1ff'});
	charts["incoming"].chart.addTimeSeries(charts["incoming"].series[4], {lineWidth: 2, strokeStyle: '#86626eff'});
	charts["incoming"].chart.addTimeSeries(charts["incoming"].series[5], {lineWidth: 2, strokeStyle: '#4f646fff'});
	charts["incoming"].chart.addTimeSeries(charts["incoming"].series[6], {lineWidth: 2, strokeStyle: '#535657ff'});
	charts["incoming"].chart.addTimeSeries(charts["incoming"].series[7], {lineWidth: 2, strokeStyle: '#8c271eff'});
	charts["incoming"].chart.addTimeSeries(charts["incoming"].series[8], {lineWidth: 2, strokeStyle: '#898952ff'});
	charts["incoming"].canvas.width=660;
	charts["incoming"].canvas.height=140;
	charts["incoming"].chart.streamTo(charts["incoming"].canvas, 1000);
	charts["incoming"].chart.resize();
	
	//Start outgoing chart
	charts["outgoing"].chart.addTimeSeries(charts["outgoing"].series[0], {lineWidth: 2, strokeStyle: '#40C000'});
	charts["outgoing"].canvas.width=660;
	charts["outgoing"].canvas.height=140;
	charts["outgoing"].chart.streamTo(charts["outgoing"].canvas, 1000);
	charts["outgoing"].chart.resize();
	
	//The legends
	const legends = {
		incoming   : document.querySelector("#incoming-chart .legend span"),
		outgoing   : document.querySelector("outgoing-chart .legend span"),
	};
	
	let offset = 0;
	tm.on("event",(event)=>{
		if (event.name=="stats")
		{
			//Get stats
			const stats = event.data;
			if (!offset)
				//Calculate time diff between us an server
				offset = (new Date()).getTime() - data.ts;
			//Get modified timestamp
			const ts = data.ts+offset;
			
			//For each layer
			for (const layer of stats.inconming.layers)
			{
				const i = layer.spatialLayerId*3 +layer.temporalLayerId;
				charts["incoming"].series[i].append(ts, layer.bitrate);
				legends.incoming[1].innerHTML = layer.bitrate +"bps";
			}
			
			//Outgoing bitrate
			charts["outgoing"].series[0].append(ts, stats.outgoing.total);
			legends.outgoing[0].innerHTML = stats.outgoing.total +"bps";
		}
	})
	//Start on open
	ws.onopen = async ()=>{
		
		var old = document.querySelector ('.mdl-button--colored');
		var listener = function(event) 
		{
			//Get data
			var spatialLayerId = event.target.dataset["sid"];
			var temporalLayerId = event.target.dataset["tid"];
			//Select simulcast layer
			tm.event("SELECT_LAYER",{
				spatialLayerId	: spatialLayerId,
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
			dialog.querySelector("#peerId").value = peerId;
	}
	dialog.querySelector("form").addEventListener("submit", function(event) {
		dialog.close();
		layers.style.display="inherit";
		start(this.peerId.value);
		event.preventDefault();
	});
	dialog.showModal();
	
	
};
