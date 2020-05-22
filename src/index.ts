import {Characteristic, Service, CharacteristicEventTypes, CharacteristicGetCallback} from 'hap-nodejs';
import {HomebridgeHCSR501Config} from './types';
import {Gpio, BinaryValue} from 'onoff';
import {AccessoryInformation, MotionSensor} from 'hap-nodejs/dist/lib/gen/HomeKit';
import {API, Logging} from 'homebridge';

let HBService: typeof Service;

export default function(homebridge: API): void {
    homebridge.registerAccessory('homebridge-hc-sr501', 'HC-SR501', HomebridgeSR501Sensor);
};


class HomebridgeSR501Sensor {
    private readonly gpio: Gpio;

    private readonly informationService: AccessoryInformation;

    private readonly motionSensorService: MotionSensor;

    private readonly services: Service[] = [];

    constructor(private readonly log: Logging,
                private readonly config: Partial<HomebridgeHCSR501Config>,
                private readonly api: API) {
        HBService = api.hap.Service;

        // info service
        this.informationService = new Service.AccessoryInformation(this.config.name);

        this.informationService
            .setCharacteristic(Characteristic.Manufacturer, 'PIR Manufacturer')
            .setCharacteristic(Characteristic.Model, config.model || 'HC-SR501')
            .setCharacteristic(Characteristic.SerialNumber, config.serial || '4BD53931-D4A9-4850-8E7D-8A51A942FA29');

        this.gpio = new Gpio(this.config.pinId, 'in', 'both');
        this.motionSensorService = new HBService.MotionSensor(this.config.name);
        this.motionSensorService.getCharacteristic(Characteristic.MotionDetected)?.on(CharacteristicEventTypes.GET, this.getState.bind(this));

        this.gpio.watch((err: Error, value: BinaryValue) => {
            if (!err) {
                this.motionSensorService.getCharacteristic(Characteristic.MotionDetected)?.updateValue(value);
            } else {
                this.log(err.name, err.message);
            }
        });
        this.services.push(this.informationService, this.motionSensorService);
    }

    private getState(callback: CharacteristicGetCallback) {
        const val: BinaryValue = this.gpio.readSync();
        callback(null, val);
    }

    public getServices(): Service[] {
        return this.services;
    }
}
