# homebridge-hc-sr501

Homebridge plugin for the hc-sr501 motion sensor on a Raspberry Pi. However, it should also work with basically any other motion sensor that triggers a pin on the Raspberry Pi's GPIOs.

## Installation of other plugins

Run the following command
```
npm install -g homebridge-hc-sr501
```

Chances are you are going to need sudo with that.

## Configuration

This is an example configuration file

```
"accessories" : [
    {
        "accessory" : "HC-SR501",
        "name" : "Motion Sensor",
        "pinId" : 24
    }
]
```


| Key           | Description                                                                        |
|---------------|------------------------------------------------------------------------------------|
| accessory     | Required. Has to be "HC-SR501"                                             |
| name          | Required. The name of this accessory. This will appear in your homekit app         |
| pinId         | Required. The pin you connected the motion sensor to. |
