import type { API, PlatformConfig } from 'homebridge';
import { z } from 'zod';

import { PLATFORM_NAME, PLUGIN_NAME } from './constants.ts';

const sensorConfigSchema = z.preprocess(
    (raw): unknown => {
        if (typeof raw === 'object' && raw !== null && !('pin' in raw) && 'pinId' in raw) {
            return { ...(raw as Record<string, unknown>), pin: (raw as { pinId: unknown }).pinId };
        }
        return raw;
    },
    z.object({
        name: z.string().min(1, 'Sensor name is required'),
        pin: z.coerce.number().int().min(0).max(40, 'Pin must be between 0 and 40'),
        model: z.string().optional(),
        serial: z.string().optional(),
        invert: z.boolean().optional(),
    }),
);

const platformConfigSchema = z.object({
    name: z.string().min(1, 'Platform name is required'),
    platform: z.literal(PLATFORM_NAME, { message: `platform must be "${PLATFORM_NAME}"` }),
    sensors: z.array(sensorConfigSchema).min(1, 'At least one sensor is required'),
});

export type SensorConfig = z.infer<typeof sensorConfigSchema>;
export type HcSr501PlatformConfig = z.infer<typeof platformConfigSchema>;

export interface SensorAccessoryContext {
    sensor: SensorConfig;
}

export function buildSensorUuid(api: API, sensor: SensorConfig): string {
    const identity = sensor.serial ?? sensor.name;
    return api.hap.uuid.generate(`${PLUGIN_NAME}:${identity}:${sensor.pin}`);
}

export function sensorRuntimeConfigEqual(a: SensorConfig, b: SensorConfig): boolean {
    return a.pin === b.pin && (a.invert ?? false) === (b.invert ?? false);
}

export class PlatformOptions {
    readonly name: string;
    readonly sensors: SensorConfig[];

    constructor(config: PlatformConfig) {
        const result = platformConfigSchema.safeParse(config);
        if (!result.success) {
            const messages = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
            throw new Error(`Platform configuration validation failed: ${messages.join('; ')}`);
        }

        this.assertUniqueSensors(result.data.sensors);

        this.name = result.data.name;
        this.sensors = result.data.sensors;
    }

    private assertUniqueSensors(sensors: SensorConfig[]): void {
        const identities = new Set<string>();
        for (const sensor of sensors) {
            const identity = sensor.serial ?? sensor.name;
            const key = `${identity}:${sensor.pin}`;
            if (identities.has(key)) {
                throw new Error(
                    `Platform configuration validation failed: duplicate sensor "${identity}" on pin ${sensor.pin} — ` +
                        'each sensor needs a unique name/serial and pin combination',
                );
            }
            identities.add(key);
        }
    }
}
