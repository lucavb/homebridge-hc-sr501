# homebridge-hc-sr501

Homebridge plugin for PIR motion sensors like the HC-SR501 connected to a Raspberry Pi GPIO pin. It works with basically any motion sensor that raises a GPIO pin when motion is detected.

The plugin reads the GPIO pin via [libgpiod](https://libgpiod.docs.kernel.org/), so it works on modern kernels and the Raspberry Pi 5 where the legacy sysfs interface is no longer available.

## Installation

The plugin needs the libgpiod development headers to build its native GPIO binding:

```bash
sudo apt install build-essential libgpiod-dev
```

Then install the plugin:

```bash
sudo npm install -g homebridge-hc-sr501
```

## Configuration

Add the platform to your Homebridge `config.json`:

```json
"platforms": [
    {
        "platform": "HcSr501Platform",
        "name": "Motion Sensors",
        "sensors": [
            {
                "name": "Hallway",
                "pin": 24
            }
        ]
    }
]
```

### Options

| Key      | Required | Description                                                 |
| -------- | -------- | ----------------------------------------------------------- |
| platform | Yes      | Must be `HcSr501Platform`                                   |
| name     | Yes      | The name of the platform. This is only shown in Homebridge. |
| sensors  | Yes      | A list of motion sensors connected to GPIO pins             |

Each sensor supports the following options:

| Key    | Required | Description                                                                |
| ------ | -------- | -------------------------------------------------------------------------- |
| name   | Yes      | The name of this sensor. This will appear in your HomeKit app.             |
| pin    | Yes      | The GPIO pin (BCM numbering) the motion sensor is connected to.            |
| model  | No       | Overrides the model shown in the HomeKit accessory information.            |
| serial | No       | Overrides the serial number shown in the HomeKit accessory information.    |
| invert | No       | Set to `true` if your sensor outputs `LOW` on motion. Defaults to `false`. |

### Migrating from v1.x

The plugin changed from a single accessory to a platform, so multiple sensors are now supported. Update your configuration:

```diff
- "accessories": [
-     {
-         "accessory": "HC-SR501",
-         "name": "Motion Sensor",
-         "pinId": 24
-     }
- ]
+ "platforms": [
+     {
+         "platform": "HcSr501Platform",
+         "name": "Motion Sensors",
+         "sensors": [
+             {
+                 "name": "Motion Sensor",
+                 "pin": 24
+             }
+         ]
+     }
+ ]
```

The old `pinId` key is still accepted within a sensor but is deprecated — use `pin` instead.
