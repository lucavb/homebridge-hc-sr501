import { beforeEach, describe, expect, it, vi } from 'vitest';

const { gpioInstances, gpioFault } = vi.hoisted(() => ({
    gpioInstances: [] as Array<{
        watch: ReturnType<typeof vi.fn>;
        readSync: ReturnType<typeof vi.fn>;
        unexport: ReturnType<typeof vi.fn>;
    }>,
    gpioFault: { error: null as Error | null },
}));

vi.mock('@bratbit/onoff', () => ({
    Gpio: class GpioMock {
        readonly watch = vi.fn();
        readonly readSync = vi.fn();
        readonly unexport = vi.fn();

        constructor() {
            if (gpioFault.error) {
                throw gpioFault.error;
            }
            gpioInstances.push(this);
        }
    },
}));

import { HcSr501Platform } from './platform.ts';
import {
    createFakeAccessory,
    createFakeApi,
    createFakeLog,
    flushAsyncQueue,
    platformConfig,
    sensorUuid,
} from './test-utils.ts';

describe('HcSr501Platform', () => {
    beforeEach(() => {
        gpioInstances.length = 0;
        gpioFault.error = null;
    });

    it('rejects an invalid configuration', () => {
        const { api } = createFakeApi();
        const log = createFakeLog();

        expect(() => new HcSr501Platform(log, { platform: 'HcSr501Platform' } as never, api)).toThrow();
        expect(log.error).toHaveBeenCalled();
    });

    it('registers new sensors on didFinishLaunching', async () => {
        const { api, listeners, registerPlatformAccessories } = createFakeApi();
        const log = createFakeLog();

        new HcSr501Platform(log, platformConfig([{ name: 'Hallway', pin: 17 }]) as never, api);

        listeners.get('didFinishLaunching')?.();
        await flushAsyncQueue();

        expect(gpioInstances).toHaveLength(1);
        expect(registerPlatformAccessories).toHaveBeenCalledWith(
            'homebridge-hc-sr501',
            'HcSr501Platform',
            expect.arrayContaining([expect.objectContaining({ UUID: sensorUuid('Hallway', 17) })]),
        );
    });

    it('restores cached accessories in configureAccessory', async () => {
        const { api, listeners, registerPlatformAccessories } = createFakeApi();
        const log = createFakeLog();
        const config = platformConfig([{ name: 'Hallway', pin: 17 }]);

        const platform = new HcSr501Platform(log, config as never, api);

        const { accessory } = createFakeAccessory('Hallway', sensorUuid('Hallway', 17));
        platform.configureAccessory(accessory);

        listeners.get('didFinishLaunching')?.();
        await flushAsyncQueue();

        expect(log.info).toHaveBeenCalledWith(expect.stringContaining('Restored motion sensor from cache: Hallway'));
        expect(registerPlatformAccessories).not.toHaveBeenCalled();
    });

    it('removes stale accessories that are no longer in the config', async () => {
        const { api, listeners, unregisterPlatformAccessories } = createFakeApi();
        const log = createFakeLog();

        const platform = new HcSr501Platform(log, platformConfig([{ name: 'Hallway', pin: 17 }]) as never, api);

        const { accessory } = createFakeAccessory('Old Sensor', sensorUuid('Old', 4));
        platform.configureAccessory(accessory);

        listeners.get('didFinishLaunching')?.();
        await flushAsyncQueue();

        expect(unregisterPlatformAccessories).toHaveBeenCalledWith(
            'homebridge-hc-sr501',
            'HcSr501Platform',
            expect.arrayContaining([accessory]),
        );
    });

    it('warns about cached accessories that do not match any sensor', () => {
        const { api } = createFakeApi();
        const log = createFakeLog();

        const platform = new HcSr501Platform(log, platformConfig([{ name: 'Hallway', pin: 17 }]) as never, api);

        const { accessory } = createFakeAccessory('Ghost', sensorUuid('Ghost', 99));
        platform.configureAccessory(accessory);

        expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('does not match any sensor in config'));
    });

    it('shuts down all handlers on the shutdown event', async () => {
        const { api, listeners } = createFakeApi();
        const log = createFakeLog();

        new HcSr501Platform(log, platformConfig([{ name: 'Hallway', pin: 17 }]) as never, api);
        listeners.get('didFinishLaunching')?.();
        await flushAsyncQueue();

        listeners.get('shutdown')?.();
        await flushAsyncQueue();

        expect(gpioInstances[0]?.unexport).toHaveBeenCalled();
    });

    it('registers every configured sensor', async () => {
        const { api, listeners, registerPlatformAccessories } = createFakeApi();
        const log = createFakeLog();

        new HcSr501Platform(
            log,
            platformConfig([
                { name: 'Hallway', pin: 17 },
                { name: 'Kitchen', pin: 27, invert: true },
            ]) as never,
            api,
        );

        listeners.get('didFinishLaunching')?.();
        await flushAsyncQueue();

        expect(gpioInstances).toHaveLength(2);
        expect(registerPlatformAccessories).toHaveBeenCalledTimes(1);
        const registered = registerPlatformAccessories.mock.calls[0]?.[2] as Array<{ UUID: string }>;
        expect(registered).toHaveLength(2);
        expect(registered.map((accessory) => accessory.UUID)).toEqual(
            expect.arrayContaining([sensorUuid('Hallway', 17), sensorUuid('Kitchen', 27)]),
        );
    });

    it('rejects duplicate sensor identities', () => {
        const { api } = createFakeApi();
        const log = createFakeLog();

        expect(
            () =>
                new HcSr501Platform(
                    log,
                    platformConfig([
                        { name: 'Hallway', pin: 17 },
                        { name: 'Hallway', pin: 17 },
                    ]) as never,
                    api,
                ),
        ).toThrow(/duplicate sensor/);
        expect(gpioInstances).toHaveLength(0);
    });

    it('warns when the deprecated pinId key is used', () => {
        const { api } = createFakeApi();
        const log = createFakeLog();

        new HcSr501Platform(log, platformConfig([{ name: 'Hallway', pinId: 24 }]) as never, api);

        expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('"pinId"'));
    });

    it('logs and skips registration when opening a sensor pin fails', async () => {
        const { api, listeners, registerPlatformAccessories } = createFakeApi();
        const log = createFakeLog();

        new HcSr501Platform(log, platformConfig([{ name: 'Hallway', pin: 17 }]) as never, api);
        gpioFault.error = new Error('pin in use');

        listeners.get('didFinishLaunching')?.();
        await flushAsyncQueue();

        expect(log.error).toHaveBeenCalledWith(expect.stringContaining('Failed to create motion sensor Hallway'));
        expect(registerPlatformAccessories).not.toHaveBeenCalled();
    });

    it('removes failed new accessories from the cache so a retry can register them', async () => {
        const { api, listeners, registerPlatformAccessories } = createFakeApi();
        const log = createFakeLog();

        new HcSr501Platform(log, platformConfig([{ name: 'Hallway', pin: 17 }]) as never, api);

        gpioFault.error = new Error('pin in use');
        listeners.get('didFinishLaunching')?.();
        await flushAsyncQueue();
        expect(registerPlatformAccessories).not.toHaveBeenCalled();

        gpioFault.error = null;
        listeners.get('didFinishLaunching')?.();
        await flushAsyncQueue();

        expect(gpioInstances).toHaveLength(1);
        expect(registerPlatformAccessories).toHaveBeenCalledTimes(1);
    });

    it('updates the cached accessory display name and metadata on rename', async () => {
        const { api, listeners } = createFakeApi();
        const log = createFakeLog();

        const config = platformConfig([{ name: 'New Name', pin: 17, serial: 'SN-1' }]);
        const platform = new HcSr501Platform(log, config as never, api);

        const { accessory } = createFakeAccessory('Old Name', 'uuid(homebridge-hc-sr501:SN-1:17)');
        platform.configureAccessory(accessory);
        listeners.get('didFinishLaunching')?.();
        await flushAsyncQueue();

        expect(accessory.updateDisplayName).toHaveBeenCalledWith('New Name');
    });

    it('does not reattach handlers when the runtime config is unchanged', async () => {
        const { api, listeners } = createFakeApi();
        const log = createFakeLog();

        const platform = new HcSr501Platform(log, platformConfig([{ name: 'Hallway', pin: 17 }]) as never, api);

        const { accessory } = createFakeAccessory('Hallway', sensorUuid('Hallway', 17));
        platform.configureAccessory(accessory);
        listeners.get('didFinishLaunching')?.();
        await flushAsyncQueue();

        expect(gpioInstances).toHaveLength(1);
        expect(log.error).not.toHaveBeenCalled();
    });
});
