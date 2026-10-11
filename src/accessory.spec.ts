import { beforeEach, describe, expect, it, vi } from 'vitest';

const { gpioInstances } = vi.hoisted(() => ({
    gpioInstances: [] as Array<{
        watch: ReturnType<typeof vi.fn>;
        readSync: ReturnType<typeof vi.fn>;
        unexport: ReturnType<typeof vi.fn>;
        pin: number;
        direction: string;
        edge: string;
    }>,
}));

vi.mock('@bratbit/onoff', () => ({
    Gpio: class GpioMock {
        readonly watch = vi.fn();
        readonly readSync = vi.fn();
        readonly unexport = vi.fn();

        constructor(
            readonly pin: number,
            readonly direction: string,
            readonly edge: string,
        ) {
            gpioInstances.push(this);
        }
    },
}));

import { HcSr501Accessory } from './accessory.ts';
import { createFakeAccessory, createFakeApi, createFakeLog, sensorUuid } from './test-utils.ts';
import type { SensorConfig } from './config.ts';

const sensor = (overrides: Partial<SensorConfig> = {}): SensorConfig => ({
    name: 'Hallway',
    pin: 17,
    ...overrides,
});

describe('HcSr501Accessory', () => {
    beforeEach(() => {
        gpioInstances.length = 0;
    });

    it('opens the gpio pin for input with edge detection on both edges', () => {
        const { api } = createFakeApi();
        const { accessory } = createFakeAccessory('Hallway', sensorUuid('Hallway', 17));

        new HcSr501Accessory(createFakeLog(), sensor(), accessory, api);

        expect(gpioInstances).toHaveLength(1);
        expect(gpioInstances[0]?.pin).toBe(17);
        expect(gpioInstances[0]?.direction).toBe('in');
        expect(gpioInstances[0]?.edge).toBe('both');
    });

    it('reuses an existing motion sensor service and registers the get handler', () => {
        const { api } = createFakeApi();
        const { accessory, motionSensorService } = createFakeAccessory('Hallway', sensorUuid('Hallway', 17));

        new HcSr501Accessory(createFakeLog(), sensor(), accessory, api);

        expect(accessory.getService).toHaveBeenCalled();
        expect(motionSensorService.getCharacteristic).toHaveBeenCalledWith('MotionDetected');
        expect(motionSensorService.getCharacteristic().onGet).toHaveBeenCalled();
    });

    it('creates a motion sensor service when missing', () => {
        const { api } = createFakeApi();
        const { accessory } = createFakeAccessory('Hallway', sensorUuid('Hallway', 17));
        vi.mocked(accessory.getService).mockReturnValue(undefined);

        new HcSr501Accessory(createFakeLog(), sensor(), accessory, api);

        expect(accessory.addService).toHaveBeenCalled();
    });

    it('sets accessory information from the config', () => {
        const { api } = createFakeApi();
        const { accessory, informationService } = createFakeAccessory('Hallway', sensorUuid('Hallway', 17));

        new HcSr501Accessory(createFakeLog(), sensor({ model: 'Custom Model', serial: 'SN-1' }), accessory, api);

        expect(informationService.setCharacteristic).toHaveBeenCalledWith('Manufacturer', 'PIR Manufacturer');
        expect(informationService.setCharacteristic).toHaveBeenCalledWith('Model', 'Custom Model');
        expect(informationService.setCharacteristic).toHaveBeenCalledWith('SerialNumber', 'SN-1');
    });

    it('updates the motion characteristic when the gpio signals motion', () => {
        const { api } = createFakeApi();
        const { accessory, motionSensorService } = createFakeAccessory('Hallway', sensorUuid('Hallway', 17));
        const log = createFakeLog();

        new HcSr501Accessory(log, sensor(), accessory, api);

        const watchCallback = gpioInstances[0]?.watch.mock.calls[0]?.[0];
        expect(watchCallback).toBeTypeOf('function');

        watchCallback?.(null, 1);
        expect(motionSensorService.getCharacteristic().updateValue).toHaveBeenCalledWith(true);

        watchCallback?.(null, 0);
        expect(motionSensorService.getCharacteristic().updateValue).toHaveBeenCalledWith(false);
    });

    it('inverts the signal when configured', () => {
        const { api } = createFakeApi();
        const { accessory, motionSensorService } = createFakeAccessory('Hallway', sensorUuid('Hallway', 17));

        new HcSr501Accessory(createFakeLog(), sensor({ invert: true }), accessory, api);

        const watchCallback = gpioInstances[0]?.watch.mock.calls[0]?.[0];
        watchCallback?.(null, 1);
        expect(motionSensorService.getCharacteristic().updateValue).toHaveBeenCalledWith(false);
    });

    it('applies invert on the get handler path', () => {
        const { api } = createFakeApi();
        const { accessory, motionSensorService } = createFakeAccessory('Hallway', sensorUuid('Hallway', 17));

        new HcSr501Accessory(createFakeLog(), sensor({ invert: true }), accessory, api);

        const getHandler = motionSensorService.characteristic.onGet.mock.calls[0]?.[0];

        gpioInstances[0]?.readSync.mockReturnValue(1);
        expect(getHandler?.()).toBe(false);

        gpioInstances[0]?.readSync.mockReturnValue(0);
        expect(getHandler?.()).toBe(true);
    });

    it('logs gpio watch errors', () => {
        const { api } = createFakeApi();
        const { accessory } = createFakeAccessory('Hallway', sensorUuid('Hallway', 17));
        const log = createFakeLog();

        new HcSr501Accessory(log, sensor(), accessory, api);

        const watchCallback = gpioInstances[0]?.watch.mock.calls[0]?.[0];
        watchCallback?.(new Error('gpio failed'));

        expect(log.error).toHaveBeenCalledWith(expect.stringContaining('gpio failed'));
    });

    it('returns the current pin state from the get handler', () => {
        const { api } = createFakeApi();
        const { accessory, motionSensorService } = createFakeAccessory('Hallway', sensorUuid('Hallway', 17));

        new HcSr501Accessory(createFakeLog(), sensor(), accessory, api);

        const getHandler = motionSensorService.characteristic.onGet.mock.calls[0]?.[0];
        expect(getHandler).toBeTypeOf('function');

        gpioInstances[0]?.readSync.mockReturnValue(1);
        expect(getHandler?.()).toBe(true);

        gpioInstances[0]?.readSync.mockReturnValue(0);
        expect(getHandler?.()).toBe(false);
    });

    it('logs and rethrows gpio read errors from the get handler', () => {
        const { api } = createFakeApi();
        const { accessory, motionSensorService } = createFakeAccessory('Hallway', sensorUuid('Hallway', 17));
        const log = createFakeLog();

        new HcSr501Accessory(log, sensor(), accessory, api);

        const getHandler = motionSensorService.characteristic.onGet.mock.calls[0]?.[0];
        gpioInstances[0]?.readSync.mockImplementation(() => {
            throw new Error('read failed');
        });

        expect(() => getHandler?.()).toThrow('read failed');
        expect(log.error).toHaveBeenCalledWith(expect.stringContaining('read failed'));
    });

    it('unexports the gpio on shutdown', async () => {
        const { api } = createFakeApi();
        const { accessory } = createFakeAccessory('Hallway', sensorUuid('Hallway', 17));

        const handler = new HcSr501Accessory(createFakeLog(), sensor(), accessory, api);

        await handler.shutdown();

        expect(gpioInstances[0]?.unexport).toHaveBeenCalled();
    });

    it('detects runtime config changes and updates metadata', () => {
        const { api } = createFakeApi();
        const { accessory, informationService } = createFakeAccessory('Hallway', sensorUuid('Hallway', 17));

        const handler = new HcSr501Accessory(createFakeLog(), sensor(), accessory, api);

        expect(handler.hasSameRuntimeConfig(sensor({ invert: false }))).toBe(true);
        expect(handler.hasSameRuntimeConfig(sensor({ pin: 18 }))).toBe(false);
        expect(handler.hasSameRuntimeConfig(sensor({ invert: true }))).toBe(false);

        handler.updateMetadata(sensor({ model: 'New Model' }));

        expect(informationService.setCharacteristic).toHaveBeenCalledWith('Model', 'New Model');
    });

    it('persists the sensor config on the accessory context', () => {
        const { api } = createFakeApi();
        const { accessory } = createFakeAccessory('Hallway', sensorUuid('Hallway', 17));

        const initialConfig = sensor({ serial: 'SN-1' });
        const handler = new HcSr501Accessory(createFakeLog(), initialConfig, accessory, api);

        expect(accessory.context.sensor).toBe(initialConfig);

        const updatedConfig = sensor({ serial: 'SN-1', invert: true });
        handler.updateMetadata(updatedConfig);

        expect(accessory.context.sensor).toBe(updatedConfig);
    });

    it('renames the motion sensor service when metadata updates', () => {
        const { api } = createFakeApi();
        const { accessory, motionSensorService } = createFakeAccessory('Hallway', sensorUuid('Hallway', 17));

        const handler = new HcSr501Accessory(createFakeLog(), sensor(), accessory, api);
        handler.updateMetadata(sensor({ name: 'Renamed' }));

        expect(motionSensorService.setCharacteristic).toHaveBeenCalledWith('Name', 'Renamed');
    });
});
