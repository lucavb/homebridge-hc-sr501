import { vi, type Mock } from 'vitest';
import type { API, PlatformAccessory } from 'homebridge';

import { PLATFORM_NAME } from './constants.ts';
import type { SensorAccessoryContext } from './config.ts';

export class FakeCharacteristic {
    readonly onGet: Mock = vi.fn().mockReturnThis();
    readonly updateValue: Mock = vi.fn().mockReturnThis();
}

export class FakeService {
    readonly characteristic = new FakeCharacteristic();
    readonly getCharacteristic: Mock = vi.fn(() => this.characteristic);
    readonly setCharacteristic: Mock = vi.fn().mockReturnThis();
}

export class FakeMotionSensorService extends FakeService {}

export class FakeAccessoryInformationService extends FakeService {}

export interface FakeAccessoryBundle {
    accessory: PlatformAccessory<SensorAccessoryContext>;
    motionSensorService: FakeMotionSensorService;
    informationService: FakeAccessoryInformationService;
}

export class FakePlatformAccessory {
    readonly motionSensorService = new FakeMotionSensorService();
    readonly informationService = new FakeAccessoryInformationService();
    readonly context = {} as SensorAccessoryContext;
    readonly getService: Mock = vi.fn((service: unknown) => {
        if (service === FakeMotionSensorService) {
            return this.motionSensorService;
        }
        if (service === FakeAccessoryInformationService) {
            return this.informationService;
        }
        return undefined;
    });
    readonly addService: Mock = vi.fn(() => this.motionSensorService);
    readonly updateDisplayName: Mock = vi.fn();

    constructor(
        public displayName: string,
        public UUID: string,
    ) {}
}

export function createFakeAccessory(name: string, uuid: string): FakeAccessoryBundle {
    const accessory = new FakePlatformAccessory(name, uuid);

    return {
        accessory: accessory as unknown as PlatformAccessory<SensorAccessoryContext>,
        motionSensorService: accessory.motionSensorService,
        informationService: accessory.informationService,
    };
}

export function createFakeLog(): { info: Mock; warn: Mock; error: Mock; debug: Mock } {
    return {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
    };
}

export interface FakeApiBundle {
    api: API;
    listeners: Map<string, () => void>;
    registerPlatformAccessories: Mock;
    unregisterPlatformAccessories: Mock;
}

export function createFakeApi(): FakeApiBundle {
    const listeners = new Map<string, () => void>();
    const registerPlatformAccessories = vi.fn();
    const unregisterPlatformAccessories = vi.fn();

    const api = {
        hap: {
            Service: {
                MotionSensor: FakeMotionSensorService,
                AccessoryInformation: FakeAccessoryInformationService,
            },
            Characteristic: {
                MotionDetected: 'MotionDetected',
                Manufacturer: 'Manufacturer',
                Model: 'Model',
                SerialNumber: 'SerialNumber',
                Name: 'Name',
            },
            uuid: {
                generate: (value: string): string => `uuid(${value})`,
            },
        },
        platformAccessory: FakePlatformAccessory,
        on: vi.fn((event: string, callback: () => void) => {
            listeners.set(event, callback);
        }),
        registerPlatformAccessories,
        unregisterPlatformAccessories,
    } as unknown as API;

    return { api, listeners, registerPlatformAccessories, unregisterPlatformAccessories };
}

export async function flushAsyncQueue(): Promise<void> {
    await new Promise<void>((resolve) => {
        setImmediate(resolve);
    });
}

export function sensorUuid(name: string, pin: number): string {
    return `uuid(homebridge-hc-sr501:${name}:${pin})`;
}

export function platformConfig(sensors: Array<Record<string, unknown>>): Record<string, unknown> {
    return {
        name: 'Motion Sensors',
        platform: PLATFORM_NAME,
        sensors,
    };
}
