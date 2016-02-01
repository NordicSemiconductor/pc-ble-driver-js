const driver = require('../index').driver;

var evt_count = 0;

driver.getAdapters((err, adapters) => {
    if (err) {
        console.log('Error trying to fetch adapters! ' + err);
        return;
    }

    if (adapters.length === 0) {
        console.log('No adapters found!');
        return;
    }

    var adapter_to_use = adapters[0].comName;
    console.log(`Using adapter connected to ${adapter_to_use} with SEGGER serial number: ${adapter_to_use.serialNumber}`);

    driver.open(
        'COM19',
        {
            baudRate: 115200,
            parity: 'none',
            flowControl: 'none',
            eventInterval: 100,
            logCallback: function(severity, message) {
                if (severity > 0) {
                    console.log('log: ' + severity + ', ' + message);
                }
            },

            eventCallback: function(event_array) {
                console.log('event_array length: ' + event_array.length);

                for (var i = 0; i < event_array.length; i++)
                {
                    event = event_array[i];
                    evt_count = evt_count + 1;
                    console.log('evt #' +  evt_count  + ', id: ' + event.id + ', name: ' + event.name);
                    console.log('time:' + event.time);
                    console.log('JSON: %s', JSON.stringify(event));

                    if (event.name === 'BLE_GAP_EVT_ADV_REPORT') {
                        console.log('ADDRESS: %s', event.peer_addr.address);
                        console.log('RSSI: %s', event.rssi);

                        if (event.peer_addr.address === 'E3:38:1E:0B:70:FE')
                        {
                            connect({address: 'E3:38:1E:0B:70:FE', type: 'BLE_GAP_ADDR_TYPE_RANDOM_STATIC'});
                        }
                    } else if (event.name === 'BLE_GAP_EVT_TIMEOUT') {
                        console.log('Timeout source: %s', event.src);
                    } else if (event.name === 'BLE_GAP_EVT_CONNECTED') {
                        console.log('Connected: %s', JSON.stringify(event));
                        authenticate(event.conn_handle);
                    }
                }

                if (global.gc) {
                    global.gc();
                }
            },
        },
        err => {
            if (err) {
                console.log('Error occurred opening serial port: %d', err);
                return;
            }

            driver.gap_start_scan({active: true, interval: 100, window: 31.25, timeout: 0}, err => {
                if (err) {
                    console.log('Error occured when starting scan');
                    return;
                }
            });
            /*
            // Close the driver after 10 seconds
            setTimeout(function() {
                driver.close(function(err) {
                    if (err) {
                        console.log('ERROR closing driver: ' + err);
                        return;
                    }

                    console.log('Driver closed OK!');
                });
            }, 10 * 1000);
            */
        }
    );
});

function encrypt() {
    /* gap_encrypt(conn_handle, master_id, enc_info, callback)
     *
     * master_id: {
     *     'ediv': <0 to 0xFFFF>,
     *     'rand': <array of length BLE_GAP_SEC_RAND_LEN (=8)>
     * }
     *
     * enc_info: {
     *     'ltk': <array of length BLE_GAP_SEC_KEY_LEN (=16)>
     *     'auth': <bool>
     *     'ltk_len': <0 to 4096 (7 bits)>
     * }
     *
     * callback signature: function(err)
     *
     * http://infocenter.nordicsemi.com/topic/com.nordic.infocenter.s130.api.v1.0.0/group___b_l_e___g_a_p___f_u_n_c_t_i_o_n_s.html?cp=2_7_2_1_0_2_1_4_16#ga5b10ba191122c7cf7cfccbdf76b3c657
     */
    driver.gap_encrypt(
        connectionHandle,
        { //master_id
            ediv: 0,
            rand: [1, 2, 3, 4, 5, 6, 7, 8],
        },
        { //enc_info
            ltk: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
            auth: false,
            ltk_len: 16,
        },
        function(err) {
            if (err) {
                console.log('Error occured in gap_encrypt: ' + err);
                return;
            }

            console.log('gap_encrypt completed');
        });
}

function connect(address) {
    driver.gap_connect(address, // Address
                       {active: true, interval: 100, window: 50, timeout: 20}, // Scan parameters
                       {min_conn_interval: 30, max_conn_interval: 60, slave_latency: 0, conn_sup_timeout: 4000}, // Connection parameters
                       function(err) {
                if (err) {
                    console.log('Could not connect');
                    return;
                }

                console.log('Connection initiated to %s', address.address);
            });
}

function authenticate(conn_handle) {
    console.log('Con Handle: %d', conn_handle);
    driver.gap_authenticate(conn_handle, {
        bond: true,
        mitm: false,
        io_caps: driver.BLE_GAP_IO_CAPS_NONE,
        oob: false,
        min_key_size: 7,
        max_key_size: 16,
        kdist_periph: {
            enc: true,
            id: false,
            sign: false,
        },
        kdist_central: {
            enc: true,
            id: false,
            sign: false,
        },
    }, err => {
        if (err)
        {
            console.log('Error number: %d, Error code: %s, Errpr operation: %s, Error message: %s', err.errno, err.errcode, err.erroperation, err.errmsg);
            console.log(err);
            return;
        }

        console.log('Initiated authenticate');
    });
}
