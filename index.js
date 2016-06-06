var Service;
var Characteristic;
var HomebridgeAPI;
var Gpio = require('onoff').Gpio;


module.exports = function(homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    HomebridgeAPI = homebridge;

    // console.log(Service.ContactSensor);
    homebridge.registerAccessory("homebridge-hc-sr501", "HC-SR501", SR501);
};

function SR501(log, config) {
	this.log = log;
	this.name = config.name;
	this.pinId = config.pinId;
	this.motionSensor = new Gpio(this.pinId, 'in', 'both');




	// info service
	this.informationService = new Service.AccessoryInformation();
	    
	this.informationService
	.setCharacteristic(Characteristic.Manufacturer, "PIR Manufacturer")
	.setCharacteristic(Characteristic.Model, config.model || "HC-SR501")
	.setCharacteristic(Characteristic.SerialNumber, config.serial || "4BD53931-D4A9-4850-8E7D-8A51A942FA29");




	this.service = new Service.MotionSensor(this.name);

	this.service.getCharacteristic(Characteristic.MotionDetected)
		.on('get', this.getState.bind(this));

	var that = this;
	this.motionSensor.watch(function(err, value) {
		that.service.getCharacteristic(Characteristic.MotionDetected)
			.setValue(value);
	});

	process.on('SIGINT', function () {
		that.motionSensor.unexport();
	});
}

SR501.prototype.getState = function(callback) {
	var val = this.motionSensor.readSync();
	callback(null, val);
};

SR501.prototype.getServices = function() {
  return [this.informationService, this.service];
};