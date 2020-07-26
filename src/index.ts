import { HomebridgeHCSR501Config } from './types';
import { BinaryValue, Gpio } from 'onoff';
import {
    API,
    Characteristic,
    CharacteristicGetCallback,
    Logging,
} from 'homebridge';
import { Service } from 'hap-nodejs';
import {
    AccessoryInformation,
    MotionSensor,
} from 'hap-nodejs/dist/lib/gen/HomeKit';

let HBService: typeof Service;
let HBCharacteristic: typeof Characteristic;

const MODEL_NAME = 'HC-SR501';

export default (homebridge: API): void => {
    homebridge.registerAccessory(
        'homebridge-hc-sr501',
        'HC-SR501',
        HomebridgeSR501Sensor
    );
};

class HomebridgeSR501Sensor {
    private readonly gpio: Gpio;

    private readonly informationService: AccessoryInformation;

    private readonly motionSensorService: MotionSensor;

    private readonly services: Service[] = [];

    constructor(
        private readonly log: Logging,
        private readonly config: Partial<HomebridgeHCSR501Config>,
        private readonly api: API
    ) {
        HBService = this.api.hap.Service;
        HBCharacteristic = this.api.hap.Characteristic;

        // info service
        this.informationService = new HBService.AccessoryInformation();

        this.informationService
            .setCharacteristic(
                HBCharacteristic.Manufacturer,
                'PIR Manufacturer'
            )
            .setCharacteristic(
                HBCharacteristic.Model,
                config.model ?? MODEL_NAME
            )
            .setCharacteristic(
                HBCharacteristic.SerialNumber,
                config.serial ?? '4BD53931-D4A9-4850-8E7D-8A51A942FA29'
            );

        this.gpio = new Gpio(this.config.pinId, 'in', 'both');
        this.motionSensorService = new HBService.MotionSensor(this.config.name);
        this.motionSensorService
            .getCharacteristic(HBCharacteristic.MotionDetected)
            ?.on(
                this.api.hap.CharacteristicEventTypes.GET,
                this.getState.bind(this)
            );

        this.gpio.watch((err: Error, value: BinaryValue) => {
            if (!err) {
                this.motionSensorService
                    .getCharacteristic(HBCharacteristic.MotionDetected)
                    ?.updateValue(value);
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
