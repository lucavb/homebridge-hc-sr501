import { describe, expect, it } from 'vitest';
import type { API } from 'homebridge';

import { PLATFORM_NAME } from './constants.ts';
import { buildSensorUuid, PlatformOptions, sensorRuntimeConfigEqual } from './config.ts';

const fakeApi = {
    hap: {
        uuid: {
            generate: (value: string): string => `uuid(${value})`,
        },
    },
} as unknown as API;

const validConfig = {
    name: 'Motion Sensors',
    platform: PLATFORM_NAME,
    sensors: [{ name: 'Hallway', pin: 17 }],
};

describe('PlatformOptions', () => {
    it('parses a valid platform configuration', () => {
        const options = new PlatformOptions(validConfig);

        expect(options.name).toBe('Motion Sensors');
        expect(options.sensors).toHaveLength(1);
        expect(options.sensors[0]?.name).toBe('Hallway');
        expect(options.sensors[0]?.pin).toBe(17);
    });

    it('accepts the legacy pinId key', () => {
        const options = new PlatformOptions({
            name: 'Motion Sensors',
            platform: PLATFORM_NAME,
            sensors: [{ name: 'Hallway', pinId: 24 }],
        });

        expect(options.sensors[0]?.pin).toBe(24);
    });

    it('prefers pin over the legacy pinId key', () => {
        const options = new PlatformOptions({
            name: 'Motion Sensors',
            platform: PLATFORM_NAME,
            sensors: [{ name: 'Hallway', pin: 17, pinId: 24 }],
        });

        expect(options.sensors[0]?.pin).toBe(17);
    });

    it('rejects a sensor without pin and pinId', () => {
        expect(
            () =>
                new PlatformOptions({
                    name: 'Motion Sensors',
                    platform: PLATFORM_NAME,
                    sensors: [{ name: 'Hallway' }],
                }),
        ).toThrow(/pin/);
    });

    it('rejects duplicate sensors with the same name and pin', () => {
        expect(
            () =>
                new PlatformOptions({
                    name: 'Motion Sensors',
                    platform: PLATFORM_NAME,
                    sensors: [
                        { name: 'Hallway', pin: 17 },
                        { name: 'Hallway', pin: 17 },
                    ],
                }),
        ).toThrow(/duplicate sensor "Hallway" on pin 17/);
    });

    it('rejects duplicate sensors sharing a serial and pin', () => {
        expect(
            () =>
                new PlatformOptions({
                    name: 'Motion Sensors',
                    platform: PLATFORM_NAME,
                    sensors: [
                        { name: 'Front', pin: 17, serial: 'SN-1' },
                        { name: 'Back', pin: 17, serial: 'SN-1' },
                    ],
                }),
        ).toThrow(/duplicate sensor "SN-1" on pin 17/);
    });

    it('accepts sensors with the same name on different pins', () => {
        const options = new PlatformOptions({
            name: 'Motion Sensors',
            platform: PLATFORM_NAME,
            sensors: [
                { name: 'Hallway', pin: 17 },
                { name: 'Hallway', pin: 18 },
            ],
        });

        expect(options.sensors).toHaveLength(2);
    });

    it('strips the legacy pinId key from parsed sensors', () => {
        const options = new PlatformOptions({
            name: 'Motion Sensors',
            platform: PLATFORM_NAME,
            sensors: [{ name: 'Hallway', pinId: 24 }],
        });

        expect(options.sensors[0]?.pin).toBe(24);
        expect('pinId' in (options.sensors[0] ?? {})).toBe(false);
    });

    it('rejects an out of range pin', () => {
        expect(
            () =>
                new PlatformOptions({
                    name: 'Motion Sensors',
                    platform: PLATFORM_NAME,
                    sensors: [{ name: 'Hallway', pin: 999 }],
                }),
        ).toThrow();
    });

    it('rejects an empty sensor list', () => {
        expect(
            () =>
                new PlatformOptions({
                    name: 'Motion Sensors',
                    platform: PLATFORM_NAME,
                    sensors: [],
                }),
        ).toThrow('At least one sensor is required');
    });

    it('rejects a wrong platform identifier', () => {
        expect(
            () =>
                new PlatformOptions({
                    name: 'Motion Sensors',
                    platform: 'SomethingElse',
                    sensors: [{ name: 'Hallway', pin: 17 }],
                }),
        ).toThrow(`platform must be "${PLATFORM_NAME}"`);
    });

    it('rejects a sensor without a name', () => {
        expect(
            () =>
                new PlatformOptions({
                    name: 'Motion Sensors',
                    platform: PLATFORM_NAME,
                    sensors: [{ pin: 17 }],
                }),
        ).toThrow();
    });
});

describe('buildSensorUuid', () => {
    it('uses the serial when present', () => {
        const uuid = buildSensorUuid(fakeApi, { name: 'Hallway', pin: 17, serial: 'SN-1' });

        expect(uuid).toBe('uuid(homebridge-hc-sr501:SN-1:17)');
    });

    it('falls back to the name', () => {
        const uuid = buildSensorUuid(fakeApi, { name: 'Hallway', pin: 17 });

        expect(uuid).toBe('uuid(homebridge-hc-sr501:Hallway:17)');
    });
});

describe('sensorRuntimeConfigEqual', () => {
    it('treats missing invert as false', () => {
        expect(sensorRuntimeConfigEqual({ name: 'a', pin: 17 }, { name: 'a', pin: 17, invert: false })).toBe(true);
    });

    it('detects pin changes', () => {
        expect(sensorRuntimeConfigEqual({ name: 'a', pin: 17 }, { name: 'a', pin: 18 })).toBe(false);
    });

    it('detects invert changes', () => {
        expect(sensorRuntimeConfigEqual({ name: 'a', pin: 17, invert: true }, { name: 'a', pin: 17 })).toBe(false);
    });
});
