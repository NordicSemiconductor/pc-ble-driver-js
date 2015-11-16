const driver = require('../index').driver;

var evt_count = 0;
var connectionHandle = 0;
var interval;
var valueHandle = 0;
var characteristicHandle = 0;
var addedVSUUIDType = -1;

driver.open(
    'COM19',
    {
        baudRate: 115200,
        parity: 'none',
        flowControl: 'none',
        eventInterval: 200,
        logCallback: function(severity, message) {
            if (severity > 0) {
                console.log('log: ' + severity + ', ' + message);
            }
        },

        eventCallback: onBleEvent,
    },
    function(err) {
        if (err) {
            console.log('Error occurred opening serial port: %d', err);
            return;
        }

        addVsUuid();
    }
);

function onBleEvent(event_array) {
    console.log('event_array length: ' + event_array.length);

    for (var i = 0; i < event_array.length; i++)
    {
        event = event_array[i];
        evt_count = evt_count + 1;
        console.log('evt #' +  evt_count  + ', id: ' + event.id + ', name: ' + event.name);
        console.log('time:' + event.time);

        //console.log("JSON: %s", JSON.stringify(event));
        if (event.name === 'BLE_GAP_EVT_ADV_REPORT') {
            console.log('ADDRESS: %s', event.peer_addr.address);
            console.log('RSSI: %s', event.rssi);
        } else if (event.name === 'BLE_GAP_EVT_TIMEOUT') {
            console.log('Timeout source: %s', event.src);
        } else if (event.name === 'BLE_GAP_EVT_CONNECTED') {
            connectionHandle = event.conn_handle;
            console.log('Connected. Handle: %d', connectionHandle);

            //connSecGet();
            //setTimeout(authenticate, 2000);
        } else if (event.name === 'BLE_GATTS_EVT_SYS_ATTR_MISSING') {
            driver.gatts_set_system_attribute(connectionHandle, 0, 0, 0, function(err) {
                if (err) {
                    console.log('Failed setting system attributes');
                    console.log(err);
                }
            });
        } else if (event.name === 'BLE_GATTS_EVT_WRITE') {
            if (event.context.char_uuid.uuid == 0x2A37) {
                var write_data = event.data[0];
                if (write_data === driver.BLE_GATT_HVX_NOTIFICATION) {
                    heartRate = 10;
                    interval = setInterval(function() {
                        heartRate += 5;
                        hvxParams = {
                            handle: valueHandle,
                            type: driver.BLE_GATT_HVX_NOTIFICATION,
                            offset: 0,
                            len: [1],
                            data: [heartRate, 0],
                        };
                        driver.gatts_hvx(connectionHandle, hvxParams, function(err, hvx_length) {
                            if (err) {
                                console.log('HVX error');
                                console.log(err);
                            }
                        });
                    }, 1000);
                } else {
                    clearInterval(interval);
                }
            }
        } else if (event.name === 'BLE_GAP_EVT_SEC_PARAMS_REQUEST') {
            console.log('GapSecParamsRequest: ' + JSON.stringify(event));
            //secParamsReply();
        } else if (event.name === 'BLE_GAP_EVT_SEC_INFO_REQUEST') {
            console.log('GapSecInfoRequest: ' + JSON.stringify(event));
            //secInfoReply();
        } else if (event.name === 'BLE_GAP_EVT_CONN_SEC_UPDATE') {
            console.log('Connection security update event received:');
            console.log(JSON.stringify(event));
        } else if (event.name === 'BLE_GAP_EVT_AUTH_STATUS') {
            console.log('Auth status event received:');
            console.log(JSON.stringify(event));
        } else if (event.name === 'BLE_EVT_USER_MEM_REQUEST') {
            console.log('User Mem request received:');
            console.log(JSON.stringify(event));
            driver.user_mem_reply(event.conn_handle, 0, function(err) {
                if (err)
                {
                    console.log('Error when replying to user memory request');
                    console.log(err);
                    return;
                }

                console.log('Denied user memory request');
            });
        }
    }
}

function addVsUuid() {
    driver.add_vs_uuid({uuid128: '11220000-3344-5566-7788-99aabbccddee'},
        function(err, type) {
            if (err)
            {
                console.log('Error occured when adding 128-bit UUID');
                console.log(err);
                return;
            }

            console.log('Added 128-bit UUID with type %d', type);
            addedVSUUIDType = type;

            encodeUUID();
            decodeUUID();

            setAppearance();
        }
    );
}

function setAppearance()
{
    driver.gap_set_appearance(driver.BLE_APPEARANCE_GENERIC_TAG, function(err) {
        if (err)
        {
            console.log('Error occured when setting appearance');
            console.log(err);
            return;
        }

        getAppearance();
    });
}

function getAppearance()
{
    driver.gap_get_appearance(function(err, appearance) {
        if (err)
        {
            console.log('Error occured when getting appearance');
            console.log(err);
            return;
        }

        setPPCP();
    });
}


function setPPCP()
{
    driver.gap_set_ppcp({
                            min_conn_interval: 0x0050,
                            max_conn_interval: 0x00A0,
                            slave_latency: 0,
                            conn_sup_timeout: 0x03E8
                        },
                        function(err) {
        if (err)
        {
            console.log('Error occured when setting ppcp');
            console.log(err);
            return;
        }

        getPPCP();
    });
}

function getPPCP()
{
    driver.gap_get_ppcp(function(err, ppcp) {
        if (err)
        {
            console.log('Error occured when getting ppcp');
            console.log(err);
            return;
        }

        console.log(JSON.stringify(ppcp));

        addService();
    });
}

function encodeUUID() {
    driver.encode_uuid({uuid: 0x2A37, type: addedVSUUIDType}, function(err, len, uuid, uuidString) {
        if (err)
        {
            console.log('Error occured when encoding UUID');
            console.log(err);
            return;
        }

        console.log('Encoded uuid. Result: Length: %d Full UUID: %s UUIDString: %s', len, JSON.stringify(uuid), uuidString);
    });
}

function decodeUUID() {
    driver.decode_uuid(16, '11222A3733445566778899AABBCCDDEE', function(err, uuid) {
        if (err)
        {
            console.log('Error occured when decoding UUID');
            console.log(err);
            return;
        }

        console.log('Decoded uuid. Result: %s', JSON.stringify(uuid));
    });
}

function addService() {
    driver.gatts_add_service(1, {uuid: 0x180D, type: driver.BLE_UUID_TYPE_BLE},
        function(err, handle) {
            if (err) {
                console.log('Error occured when adding service');
                console.log(err);
                return;
            }

            console.log('Added service with handle %d', handle);

            addCharacteristic(handle);
        }
    );
}

function addCharacteristic(handle) {
    driver.gatts_add_characteristic(handle,
        { // metadata
            char_props:
            {
                broadcast: false,
                read: true,
                write_wo_resp: false,
                write: false,
                notify: true,
                indicate: false,
                auth_signed_wr: false,
            },
            char_ext_props: {reliable_wr: false, wr_aux: false},
            char_user_desc_max_size: 0,
            char_user_desc_size: 0,
            char_pf: 0, // Presentation format (ble_gatts_char_pf_t) May be 0
            user_desc_md: 0, // User Description descriptor (ble_gatts_attr_md_t) May be 0
            cccd_md: // Client Characteristic Configuration Descriptor (ble_gatts_attr_md_t) May be 0
            {
                read_perm: {sm: 1, lv: 1},
                write_perm: {sm: 1, lv: 1},
                vlen: false,
                vloc: driver.BLE_GATTS_VLOC_STACK,
                rd_auth: false,
                wr_auth: false,
            },
            sccd_md: 0, // Server Characteristic Configuration Descriptor (ble_gatts_attr_md_t) May be 0
        },
        { // attributeStructure
            uuid: {uuid: 0x2A37, type: addedVSUUIDType},
            attr_md: {
                read_perm: {sm: 1, lv: 1},
                write_perm: {sm: 1, lv: 1},
                vlen: false,
                vloc: 1,
                rd_auth: false,
                wr_auth: false,
            },
            init_len: 1,
            init_offs: 0,
            max_len: 1,
            value: [43],
        },
        function(err, handles) {
            if (err) {
                console.log('Error occured when adding characteristics');
                console.log(err);
                return;
            }

            console.log('Added characteristics with handles %s', JSON.stringify(handles));
            valueHandle = handles.value_handle;
            characteristicHandle = valueHandle - 1;

            addDescriptor();
        }
    );
}

function addDescriptor() {
    driver.gatts_add_descriptor(valueHandle,
        {
            uuid: {uuid: 0x2A38, type: 2},
            attr_md: {
                read_perm: {sm: 1, lv: 1},
                write_perm: {sm: 1, lv: 1},
                vlen: false,
                vloc: 1,
                rd_auth: false,
                wr_auth: false,
            },
            init_len: 1,
            init_offs: 0,
            max_len: 1,
            value: [43],
        },
        function(err, handle) {
            if (err) {
                console.log('Error occured when adding descriptor.');
                console.log(err);
                return;
            }

            console.log('Added descriptor with handle %d', handle);

            setAdvertisingData();
        }
    );
}

function setAdvertisingData() {
    // gap_set_advertising_data(adv_data, scan_response_data, callback)
    //
    // adv_data: null or <array of utf8 values, length 0 to BLE_GAP_ADV_MAX_SIZE (31)
    //
    // scan_response_data: same as adv_data
    //
    // callback: function(err)
    //
    // http://infocenter.nordicsemi.com/topic/com.nordic.infocenter.s130.api.v1.0.0/group___b_l_e___g_a_p___f_u_n_c_t_i_o_n_s.html?cp=2_7_2_1_0_2_1_4_2#gaddbb12e078d536ef2e93b41d77ff6243
    driver.gap_set_advertising_data(
        [8, 9, 87, 97, 121, 108, 97, 110, 100], // adv_data: 8=length, 9=complete_local_name, 'Wayland'
        [0x02, 0x0A, 0x00], // scan response, 2=length, 0xA=txpower, 0dBm
        function(err) {
            if (err) {
                console.log('Error occured when setting advertising data: ' + err);
                return;
            }

            console.log('Added advertising data.');

            startAdvertising();
        }
    );
}

function startAdvertising() {
    driver.gap_start_advertising({
            type: driver.BLE_GAP_ADV_TYPE_ADV_IND,
            fp: driver.BLE_GAP_ADV_FP_ANY,
            interval: 40,
            timeout: 180,
            channel_mask: {
                ch_37_off: false,
                ch_38_off: false,
                ch_39_off: false,
            },
        },
        function(err) {
            if (err) {
                console.log('Error occured when starting advertisement');
                console.log(err);
                return;
            }

            console.log('Started advertising');

            //setTimeout(stopAdvertising, 60000);
        }
    );
}

function stopAdvertising() {
    driver.gap_stop_advertising(function(err) {
        if (err) {
            console.log('Error occured when stopping advertising');
        }

        console.log('Stopped advertising');
    });
}

function connSecGet() {
    /* gap_conn_sec_get(connHandle, callback)
     * signature of callback: function(err, connSec)
     *
     * connSec: {
     *       'sec_mode': {
     *           'sm': <1 to 2>,
     *           'lv': <1 to 3>,
     *       },
     *       'encr_key_size': <7 to 16>,
     *   }
     *
     * http://infocenter.nordicsemi.com/topic/com.nordic.infocenter.s130.api.v1.0.0/group___b_l_e___g_a_p___f_u_n_c_t_i_o_n_s.html?cp=2_7_2_1_0_2_1_4_10#ga05ed7aaeb2d1f1ff91019a1ffeaf9fc0
     */
    driver.gap_conn_sec_get(connectionHandle, function(err, connSec) {
        if (err) {
            console.log('Error occured in gap_conn_sec_get');
            return;
        }

        console.log('GapConnSecGet: ' + JSON.stringify(connSec));
    });
}

function secParamsReply() {
    // gap_sec_params_reply(connHandle, sec_status, sec_params, sec_keyset, callback)
    //
    // sec_status: <number> (driver.BLE_GAP_SEC_STATUS_)
    //
    // sec_params: {
    //     'bond': <bool>,
    //     'mitm': <bool>,
    //     'io_caps': <number> (driver.BLE_GAP_IO_CAPS_),
    //     'oob': <bool>,
    //     'min_key_size': <number, 7 to 16>,
    //     'max_key_size': <number, 7 to 16>,
    //     'kdist_periph': {
    //         'enc': <bool>,
    //         'id': <bool>,
    //         'sign': <bool>
    //     },
    //     'kdist_central': {
    //         'enc': <bool>,
    //         'id': <bool>,
    //         'sign': <bool>
    //     },
    // }
    //
    // sec_keyset: {
    //     'keys_periph': {
    //         'enc_key': null or {
    //             'enc_info': {
    //                 'ltk': <array of length 8>,
    //                 'auth': <bool>,
    //                 'ltk_len': <number>
    //             },
    //             'master_id': {
    //                 'ediv': <number, 16bit>,
    //                 'rand': <array of length 16>
    //             }
    //         },
    //         'id_key': null or {
    //             'id_info': {
    //                 'irk': <array of length 8>,
    //             },
    //             'id_addr_info': {
    //                 'addr': <string ('xx:xx:xx:xx:xx:xx')>,
    //                 'type': <number> (driver.BLE_GAP_ADDR_TYPE_),
    //             }
    //         },
    //         'sign_key': null or {
    //             'csrk': <array of length 8>
    //         }
    //     },
    //     'keys_central': (same as keys_periph)
    // }
    //
    // callback: function(err, keyset)
    //
    // http://infocenter.nordicsemi.com/topic/com.nordic.infocenter.s130.api.v1.0.0/group___b_l_e___g_a_p___f_u_n_c_t_i_o_n_s.html?cp=2_7_2_1_0_2_1_4_25#ga7b23027c97b3df21f6cbc23170e55663
    driver.gap_sec_params_reply(
        connectionHandle,
        driver.BLE_GAP_SEC_STATUS_SUCCESS, //sec_status
        { //sec_params
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
        },
        { // sec_keyset
            keys_periph: {
                enc_key: {
                    enc_info: {
                        ltk: [0, 0, 0, 0, 0, 0, 0, 0],
                        auth: false,
                        ltk_len: 8,
                    },
                    master_id: {
                        ediv: 0x1234,
                        rand: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                    },
                },
                id_key: null,
                sign_key: null,
            },
            keys_central: {
                enc_key: {
                    enc_info: {
                        ltk: [0, 0, 0, 0, 0, 0, 0, 0],
                        auth: false,
                        ltk_len: 8,
                    },
                    master_id: {
                        ediv: 0x1234,
                        rand: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                    },
                },
                id_key: null,
                sign_key: null,
            },
        },
        function(err, keyset) {
            if (err) {
                console.log('Error occured in gap_sec_params_reply');
                return;
            }

            console.log('gap_sec_params_reply completed');
            console.log('keyset: ' + JSON.stringify(keyset));
        }
    );
}

function secInfoReply() {
    // gap_sec_info_reply(conn_handle, enc_info, id_info, sign_info, callback)
    //
    // enc_info: null or {
    //  'ltk': <array of length 8>,
    //  'auth': <bool>,
    //  'ltk_len': <number>
    // }
    //
    // id_info: null or {
    //  'irk': <array og length 8>
    // }
    //
    // sign_info: null or {
    //  'csrk': <array of length 8>
    // }
    // callback: function(err)
    //
    // http://infocenter.nordicsemi.com/topic/com.nordic.infocenter.s130.api.v1.0.0/group___b_l_e___g_a_p___f_u_n_c_t_i_o_n_s.html?cp=2_7_2_1_0_2_1_4_24#ga9015143d731193672dc306f6e4aff684
    driver.gap_sec_info_reply(
        connectionHandle,
        { //enc_info
            ltk: [1, 2, 3, 4, 5, 6, 7, 8],
            auth: false,
            ltk_len: 8,
        },
        null, //id_info
        null, //sign_info
        function(err) {
            if (err) {
                console.log('Error occured in gap_sec_info_reply:' + err);
                return;
            }

            console.log('gap_sec_info_reply completed');
        });
}

function authenticate() {
    driver.gap_authenticate(connectionHandle, {
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
    },
    err => {
        if (err) {
            console.log('Error occured in authenticate: ' + JSON.stringify(err));
            return;
        }

        console.log('Initiated authenticate');
    });
}
