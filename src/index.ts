import { Characteristic, Service, CharacteristicEventTypes, CharacteristicGetCallback } from 'hap-nodejs';
import { HomebridgeHCSR501Config } from './types';
import { MotionSensor } from 'hap-nodejs/dist/lib/gen/HomeKit';
import { Gpio, BinaryValue } from 'onoff';

let homebridgeService;

export default function (homebridge: any): void {
    homebridgeService = homebridge.hap.Service;

    homebridge.registerAccessory("homebridge-hc-sr501", "HC-SR501", HomebridgeSR501Sensor);
};


class HomebridgeSR501Sensor {

    private readonly gpio: Gpio;

    private motionSensorService: MotionSensor;

    private readonly services: Service[] = [];

    constructor(log: any, private config: HomebridgeHCSR501Config) {
        this.gpio = new Gpio(this.config.pinId, 'in', 'both');
        this.motionSensorService = new homebridgeService.MotionSensor(this.config.name, 'sr501_sensor_information');
        this.motionSensorService.getCharacteristic(Characteristic.MotionDetected)?.
            on(CharacteristicEventTypes.GET, this.getState.bind(this));

        this.gpio.watch((err: Error, value: BinaryValue) => {
            if (!err) {
                this.motionSensorService.getCharacteristic(Characteristic.MotionDetected)?.updateValue(value);
            } else {
                log.log(err);
            }
        });
    }

    private getState(callback: CharacteristicGetCallback) {
        var val = this.gpio.readSync();
        callback(null, val);
    }

    public getServices(): Service[] {
        return this.services;
    }

}
