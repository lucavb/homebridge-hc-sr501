import { Gpio } from '@bratbit/onoff';
import type { API, Logging, PlatformAccessory, Service } from 'homebridge';

import { type SensorAccessoryContext, type SensorConfig, sensorRuntimeConfigEqual } from './config.ts';

const MODEL_NAME = 'HC-SR501';

export class HcSr501Accessory {
    private config: SensorConfig;

    private readonly gpio: Gpio;

    private readonly motionSensorService: Service;

    constructor(
        private readonly log: Logging,
        config: SensorConfig,
        private readonly accessory: PlatformAccessory<SensorAccessoryContext>,
        private readonly api: API,
    ) {
        this.config = config;

        this.gpio = new Gpio(config.pin, 'in', 'both');

        this.configureInformationService();

        const motionSensorService =
            this.accessory.getService(this.api.hap.Service.MotionSensor) ??
            this.accessory.addService(this.api.hap.Service.MotionSensor, config.name);

        this.motionSensorService = motionSensorService;
        this.applyServiceName();

        this.accessory.context.sensor = config;

        motionSensorService
            .getCharacteristic(this.api.hap.Characteristic.MotionDetected)
            .onGet(() => this.getMotionDetected());

        this.gpio.watch((err: Error | null | undefined, value: 0 | 1) => {
            if (err) {
                this.log.error(`GPIO watch error for ${config.name}: ${err.message}`);
                return;
            }

            motionSensorService
                .getCharacteristic(this.api.hap.Characteristic.MotionDetected)
                .updateValue(this.toMotionDetected(value));
        });
    }

    hasSameRuntimeConfig(other: SensorConfig): boolean {
        return sensorRuntimeConfigEqual(this.config, other);
    }

    updateMetadata(config: SensorConfig): void {
        this.config = config;
        this.accessory.context.sensor = config;
        this.configureInformationService();
        this.applyServiceName();
    }

    async shutdown(): Promise<void> {
        this.gpio.unexport();
    }

    private applyServiceName(): void {
        this.motionSensorService.setCharacteristic(this.api.hap.Characteristic.Name, this.config.name);
    }

    private configureInformationService(): void {
        this.accessory
            .getService(this.api.hap.Service.AccessoryInformation)
            ?.setCharacteristic(this.api.hap.Characteristic.Manufacturer, 'PIR Manufacturer')
            .setCharacteristic(this.api.hap.Characteristic.Model, this.config.model ?? MODEL_NAME)
            .setCharacteristic(this.api.hap.Characteristic.SerialNumber, this.config.serial ?? this.accessory.UUID);
    }

    private toMotionDetected(value: 0 | 1): boolean {
        const motion = value === 1;
        return this.config.invert ? !motion : motion;
    }

    private getMotionDetected(): boolean {
        try {
            return this.toMotionDetected(this.gpio.readSync());
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.log.error(`Failed to read GPIO ${this.config.pin} for ${this.config.name}: ${message}`);
            throw error;
        }
    }
}
