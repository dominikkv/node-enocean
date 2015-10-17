var fs = require("fs")
var knownSensors = require("./knownSensors.json")

module.exports=function(app,config){
	if(config==undefined) config={}
	var outFile = config.hasOwnProperty("sensorFile") ? config.outFile : __dirname + '/knownSensors.json'
	var timeout= config.hasOwnProperty("timeout") ? config.timeout : 10
	app.learnMode = "off"
	app.on("data",function(data){
		if (knownSensors.hasOwnProperty(data.senderId)) {
			if(data.learnBit===1 || data.choice==="f6"){
				var sensor=knownSensors[data.senderId]
				app.emit("known-data",data)
			} else {
				if(app.learnMode==="on"){
					app.learnMode="off"
					app.emit("learn-mode-stop",{reason:"already know sensor"})
				}
			}
		} else {
			if(data.learnBit===0 || data.choice==="f6"){
				if(app.learnMode=="on"){
					app.learn({
						id:data.senderId,
						eep:data.eep,
						manufacturer:data.manufacturer,
						desc:"new sensor"
					})
	
				} else {
					// log the learn telegram for manual tech in
					if(data.choice!="f6"){
						app.emit("unknown-teach-in",data)
					}
				}
			} else {
				// the sensor is not known, but its also not a tech in, so we can not know anthing about this senser just emit a usual event for downstream handlers
				app.emit("unknown-data",data)
			}
		}
	})
	app.startLearning=function(){
		app.learnMode="on"
		app.emit("learn-mode-start")
		setTimeout(app.stopLearning,timeout*1000)
	}
	app.stopLearning=function(){
		if(app.learnMode=="on"){
			app.learnMode="off"
			app.emit("learn-mode-stop",{reason:"timeout"})
		}
	}
	app.learn = function(sensor){
		knownSensors[sensor.id]=sensor
		fs.writeFile(outFile, JSON.stringify(knownSensors, null, 4), function(err) {
    		if(err) {
      			//console.log(err);
    		} else {
    			app.learnMode="off"
      			app.emit("learn",sensor)
      			app.emit("learn-mode-stop",{reason:"success"})
   			 }
		})
	}
	app.forget = function(id){
		var tmp=""
		if(knownSensors.hasOwnProperty(id)){
			tmp=knownSensors[id]
			delete knownSensors[id];
		}
		fs.writeFile(outFile, JSON.stringify(knownSensors, null, 4), function(err) {
    		if(err) {
      			//console.log(err);
    		} else {

      			app.emit("forget",tmp)
   			 }
		})
	}
	app.info = function(id){
		return knownSensors[id]
	}
	app.allSensors = knownSensors
}
