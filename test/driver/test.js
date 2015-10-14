var expect = require('chai').expect;
var driver = require('../../index');

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
            'eventInterval': 1,
            'logLevel': 'trace',
            'logCallback': function(severity, message) {
                console.log(severity + ':' + message);
            },
            'eventCallback': function(event_array) {
                console.log('event_array length ' + event_array.length);
            }
        },
        function(err) {
            expect(err).to.be.undefined;

            console.log('Before driver.close()');
            driver.close();
            console.log('After driver.close()');

            console.log('Before driver.start_scan()');
            driver.start_scan({'active': true, 'interval': 100, 'window': 31.25, 'timeout': 0}, function(err) {
                console.log('Scan started callback');
                expect(err).to.be.undefined;
            });
            console.log('After driver.start_scan()');
        }
    );
});

process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.on('data', process.exit.bind(process, 0));
