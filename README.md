# homebridge-hc-sr501
Homebridge plugin for the hc-sr501 motion sensor on a Raspberry Pi

## Installation of other plugins

I assume that this [Guide](https://github.com/nfarina/homebridge/wiki/Running-HomeBridge-on-a-Raspberry-Pi) was followed, so your homebridge config file is under /var/homebridge and you used the systemd version. Create a folder called other_plugins in that hombridge folder and checkout this repository inside that newly created folder.

Now you want to alter the file you placed under /etc/default/homebridge accordingly

```
# Defaults / Configuration options for homebridge
# The following settings tells homebridge where to find the config.json file an$
#HOMEBRIDGE_OPTS=-U /var/homebridge
HOMEBRIDGE_OPTS=-U /var/homebridge -P /var/homebridge/other_plugins -D

# If you uncomment the following line, homebridge will log more
# You can display this via systemd's journalctl: journalctl -f -u homebridge
#DEBUG=*
```

You might need to run a systemctl command to update the config file. The system should inform you about the specific comand if you enter ``sudo service hombridge stop``. After you have executed the suggested command you'll want to enter ``sudo service hombridge restart``. Homebridge should now be aware of any additional plugins within the /var/hombridge/other_plugins folder.

## Configuration

This is an example configuration file

```
{
    "accessory" : "HC-SR501",
    "name" : "Motion Sensor",
    "pinId" : 24
}
```


| Key           | Description                                                                        |
|---------------|------------------------------------------------------------------------------------|
| accessory     | Required. Has to be "HC-SR501"                                             |
| name          | Required. The name of this accessory. This will appear in your homekit app         |
| pinId         | Required. The pin you connected the motion sensor to. |
