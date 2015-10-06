var driver = require('../index');

var evt_count = 0;

driver.get_adapters(function(err, adapters) {
    if(err) {
        console.log('Error trying to fetch adapters! ' + err);
        return;
    }

    if(adapters.length == 0) {
        console.log('No adapters found!');
        return;
    }

    var adapter_to_use = adapters[0].comName;
    console.log('Using adapter connected to ' + adapter_to_use + ' with SEGGER serial number: ' + adapters[0].serialNumber);

    driver.open(
        adapter_to_use,
        {
            'baudRate': 115200,
            'parity': 'none',
            'flowControl': 'none',
            'eventInterval': 200,
            'logCallback': function(severity, message) {
                if (severity > 0)
                {
                    console.log("log: " + severity + ", " + message);
                }
            },
            'eventCallback': function(event_array) {
                console.log("event_array length: " + event_array.length)

                for (var i = 0; i < event_array.length; i++)
                {
                    event = event_array[i];
                    evt_count = evt_count + 1;
                    console.log("evt #" +  evt_count  + ", id: " + event.id + ", name: " + event.name);
                    console.log("time:" + event.time);
                    //console.log("JSON: %s", JSON.stringify(event));

                    if(event.name === 'BLE_GAP_EVT_ADV_REPORT') {
                        console.log("ADDRESS: %s", event.peer_addr.address);
                        console.log("RSSI: %s", event.rssi);
                    }
                    else if (event.name === 'BLE_GAP_EVT_TIMEOUT') {
                        console.log("Timeout source: %s", event.src);
                    }
                }
            }
        },
        function(err) {
            if(err) {
                console.log('Error occurred opening serial port: %d', err);
                return;
            }

            driver.start_scan({'active': true, 'interval': 100, 'window': 31.25, 'timeout': 0}, function(err) {
                if(err) {
                    console.log('Error occured when starting scan');
                    return;
                }
            });
        }
    );
});