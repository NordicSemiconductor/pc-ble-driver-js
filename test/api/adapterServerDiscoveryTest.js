'use strict';

const  sinon = require('sinon');
const assert = require('assert');
const _ = require('underscore');

const proxyquire = require('proxyquire');

const AdapterFactory = require('../../api/adapterFactory.js');
const Device = require('../../api/device.js');

const commonStubs = require('./commonStubs.js');

    const twoServiceDiscoveryEvent = {
        "id":48,
        "name":"BLE_GATTC_EVT_PRIM_SRVC_DISC_RSP",
        "conn_handle": 123,
        "count":3,
        "services":[
        {
            "uuid":{"uuid":6144,"type":1, "typeString":"BLE_UUID_TYPE_BLE"},
            "handle_range":{"start_handle":1,"end_handle":7}
        },
        {
            "uuid":{"uuid":6145,"type":1, "typeString":"BLE_UUID_TYPE_BLE"},
            "handle_range":{"start_handle":8,"end_handle":8}
        }
        ]
    };

const oneServiceDiscoveryEvent = {
    "id":48,
    "name":"BLE_GATTC_EVT_PRIM_SRVC_DISC_RSP",
    "conn_handle": 123,
    "count":1,
    "services":[
    {
        "uuid":{"uuid":6153,"type":1, "typeString":"BLE_UUID_TYPE_BLE"},
        "handle_range":{"start_handle":9,"end_handle":12}
    }
    ]
};

const firstUnknownUuidServiceDiscoveryEvent = {
    "id":48,
    "name":"BLE_GATTC_EVT_PRIM_SRVC_DISC_RSP",
    "conn_handle": 123,
    "count":1,
    "services":[
    {
        "uuid":{"uuid":0x1234,"type":0, "typeString":"BLE_UUID_TYPE_UNKNOWN"},
        "handle_range":{"start_handle":1,"end_handle":8}
    }
    ]
};

const secondUnknownUuidServiceDiscoveryEvent = {
    "id":48,
    "name":"BLE_GATTC_EVT_PRIM_SRVC_DISC_RSP",
    "conn_handle": 123,
    "count":1,
    "services":[
    {
        "uuid":{"uuid":0x5678,"type":0, "typeString":"BLE_UUID_TYPE_UNKNOWN"},
        "handle_range":{"start_handle":9,"end_handle":12}
    }
    ]
};

const zeroServiceDiscoveryEvent = {
    "id":48,
    "name":"BLE_GATTC_EVT_PRIM_SRVC_DISC_RSP",
    "conn_handle":123,
    "count":0,
    "services":[]
};

const firstUnkownUuidServiceReadEvent = {
    "id":53,
    "name":"BLE_GATTC_EVT_READ_RSP",
    "conn_handle":123,
    "handle":1,
    "offset":0,
    "len":16,
    "data":{"type":"Buffer", "data":[0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x34, 0x12, 0x00, 0x00]}
};

const secondUnkownUuidServiceReadEvent = {
    "id":53,
    "name":"BLE_GATTC_EVT_READ_RSP",
    "conn_handle":123,
    "handle":9,
    "offset":0,
    "len":16,
    "data":{"type":"Buffer", "data":[0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x78, 0x56, 0x00, 0x00]}
};

const twoCharacteristicDiscoveryEvent = {
    "id":50,
    "name":"BLE_GATTC_EVT_CHAR_DISC_RSP",
    "conn_handle":123,
    "count":2,
    "chars":[{
        "uuid":{
            "uuid":10752,
            "type":1,
            "typeString":"BLE_UUID_TYPE_BLE"
        },
        "char_props":{
            "broadcast":false,
            "read":true,
            "write_wo_resp":false,
            "write":true,
            "notify":false,
            "indicate":false,
            "auth_signed_wr":false
        },
        "char_ext_props":0,
        "handle_decl":2,
        "handle_value":3
    },
    {
        "uuid":{
            "uuid":10753,
            "type":1,
            "typeString":"BLE_UUID_TYPE_BLE"
        },
        "char_props":{
            "broadcast":false,
            "read":true,
            "write_wo_resp":false,
            "write":false,
            "notify":false,
            "indicate":false,
            "auth_signed_wr":false
        },
        "char_ext_props":0,
        "handle_decl":4,
        "handle_value":5
    }
    ]
};

const oneCharacteristicDiscoveryEvent = {
    "id":50,
    "name":"BLE_GATTC_EVT_CHAR_DISC_RSP",
    "conn_handle":123,
    "count":1,
    "chars":[{
        "uuid":{
            "uuid":10756,
            "type":1,
            "typeString":"BLE_UUID_TYPE_BLE"
        },
        "char_props":{
            "broadcast":false,
            "read":true,
            "write_wo_resp":false,
            "write":false,
            "notify":false,
            "indicate":false,
            "auth_signed_wr":false
        },
        "char_ext_props":0,
        "handle_decl":6,
        "handle_value":7
    }]
};

const firstUnknownUuidCharacteristicDiscoveryEvent = {
    "id":50,
    "name":"BLE_GATTC_EVT_CHAR_DISC_RSP",
    "conn_handle":123,
    "count":1,
    "chars":[{
        "uuid":{
            "uuid":0x1234,
            "type":0,
            "typeString":"BLE_UUID_TYPE_UNKNOWN"
        },
        "char_props":{
            "broadcast":false,
            "read":true,
            "write_wo_resp":false,
            "write":false,
            "notify":false,
            "indicate":false,
            "auth_signed_wr":false
        },
        "char_ext_props":0,
        "handle_decl":2,
        "handle_value":3
    }]
};

const secondUnknownUuidCharacteristicDiscoveryEvent = {
    "id":50,
    "name":"BLE_GATTC_EVT_CHAR_DISC_RSP",
    "conn_handle":123,
    "count":1,
    "chars":[{
        "uuid":{
            "uuid":0x5678,
            "type":0,
            "typeString":"BLE_UUID_TYPE_UNKNOWN"
        },
        "char_props":{
            "broadcast":false,
            "read":true,
            "write_wo_resp":false,
            "write":false,
            "notify":false,
            "indicate":false,
            "auth_signed_wr":false
        },
        "char_ext_props":0,
        "handle_decl":4,
        "handle_value":5
    }]
};

const zeroCharacteristicDiscoveryEvent = {
    "id":50,
    "name":"BLE_GATTC_EVT_CHAR_DISC_RSP",
    "conn_handle":123,
    "count":0,
    "chars":[]
};

const firstValueCharacteristicReadEvent = {
    "id":53,
    "name":"BLE_GATTC_EVT_READ_RSP",
    "conn_handle":123,
    "handle":3,
    "offset":0,
    "len":16,
    "data":{"type":"Buffer", "data":[1,2,3]}
};

const secondValueCharacteristicReadEvent = {
    "id":53,
    "name":"BLE_GATTC_EVT_READ_RSP",
    "conn_handle":123,
    "handle":5,
    "offset":0,
    "len":16,
    "data":{"type":"Buffer", "data":[4,5,6]}
};

const thirdValueCharacteristicReadEvent = {
    "id":53,
    "name":"BLE_GATTC_EVT_READ_RSP",
    "conn_handle":123,
    "handle":7,
    "offset":0,
    "len":16,
    "data":{"type":"Buffer", "data":[]}
};

const firstUnkownUuidCharacteristicReadEvent = {
    "id":53,
    "name":"BLE_GATTC_EVT_READ_RSP",
    "conn_handle":123,
    "handle":2,
    "offset":0,
    "len":16,
    "data":{"type":"Buffer", "data":[0x0A, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x34, 0x12, 0x00, 0x00]}
};

const secondUnkownUuidCharacteristicReadEvent = {
    "id":53,
    "name":"BLE_GATTC_EVT_READ_RSP",
    "conn_handle":123,
    "handle":4,
    "offset":0,
    "len":16,
    "data":{"type":"Buffer", "data":[0x02, 0x05, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x78, 0x56, 0x00, 0x00]}
};

describe('getServices', function() {
    let bleDriver;
    let adapter;
    let bleDriverEventCallback = {};
    let connectEvent;

    beforeEach(function(done) {
        bleDriver = commonStubs.createBleDriver((eventCallback)=>{
            bleDriverEventCallback = eventCallback;
            connectEvent = commonStubs.createConnectEvent();
            done();
        });

        const adapterFactory = new AdapterFactory(bleDriver);
        adapter = adapterFactory.getAdapters().test;
        adapter.open({'baudRate': 115200, 'parity': 'none', 'flowControl': 'none'}, function(err) {});
    });

    it('should receive services from events and callback', function (done) {
        const device = new Device('remote', 'peripheral');
        device.connectionHandle = 123;

        adapter._devices[device.instanceId] = device;

        const serviceAddedSpy = sinon.spy();
        adapter.on('serviceAdded', serviceAddedSpy);

        adapter.getServices(device.instanceId, (err, services) => {
            const firstService = serviceAddedSpy.firstCall.args[0];
            const secondService = serviceAddedSpy.secondCall.args[0];
            const thirdService = serviceAddedSpy.thirdCall.args[0];

            assert.equal(services[0], firstService);
            assert.equal(services[1], secondService);
            assert.equal(services[2], thirdService);

            assert.equal(firstService.uuid, '00001800-0000-1000-8000-00805F9B34FB');
            assert.equal(firstService.startHandle, 1);
            assert.equal(firstService.endHandle, 7);

            assert.equal(secondService.uuid, '00001801-0000-1000-8000-00805F9B34FB');
            assert.equal(secondService.startHandle, 8);
            assert.equal(secondService.endHandle, 8);

            assert.equal(thirdService.uuid, '00001809-0000-1000-8000-00805F9B34FB');
            assert.equal(thirdService.startHandle, 9);
            assert.equal(thirdService.endHandle, 12);

            done();
        });

        assert(!serviceAddedSpy.called);
        assert(bleDriver.gattc_primary_services_discover.calledOnce);

        bleDriverEventCallback([twoServiceDiscoveryEvent]);
        assert(serviceAddedSpy.calledTwice);
        assert(bleDriver.gattc_primary_services_discover.calledTwice);

        bleDriverEventCallback([oneServiceDiscoveryEvent]);
        assert(serviceAddedSpy.calledThrice);
        assert(bleDriver.gattc_primary_services_discover.calledThrice);

        bleDriverEventCallback([zeroServiceDiscoveryEvent]);
        assert(serviceAddedSpy.calledThrice);
        assert(bleDriver.gattc_primary_services_discover.calledThrice);
    });

    it('should read the value if it receives unknown uuid type', function(done) {
        const device = new Device('remote', 'peripheral');
        device.connectionHandle = 123;

        adapter._devices[device.instanceId] = device;

        const serviceAddedSpy = sinon.spy();
        adapter.on('serviceAdded', serviceAddedSpy);

        adapter.getServices(device.instanceId, (err, services) => {
            assert(serviceAddedSpy.calledTwice);
            assert.equal(services[0].uuid, '00001234-0000-0000-0000-000000000000');
            assert.equal(services[1].uuid, '00005678-0000-0000-0000-000000000000');
            done();
        });

        assert(!serviceAddedSpy.called);
        assert(bleDriver.gattc_primary_services_discover.calledOnce);

        bleDriverEventCallback([firstUnknownUuidServiceDiscoveryEvent]);
        assert(!serviceAddedSpy.called);
        assert(bleDriver.gattc_primary_services_discover.calledTwice);

        bleDriverEventCallback([secondUnknownUuidServiceDiscoveryEvent]);
        assert(!serviceAddedSpy.called);
        assert(bleDriver.gattc_primary_services_discover.calledThrice);
        assert(!bleDriver.gattc_read.called);

        bleDriverEventCallback([zeroServiceDiscoveryEvent]);
        assert(!serviceAddedSpy.called);
        assert(bleDriver.gattc_primary_services_discover.calledThrice);
        assert(bleDriver.gattc_read.calledOnce);

        bleDriverEventCallback([firstUnkownUuidServiceReadEvent]);
        assert(serviceAddedSpy.calledOnce);

        bleDriverEventCallback([secondUnkownUuidServiceReadEvent]);
        assert(serviceAddedSpy.calledTwice);
    });
});

describe('getCharacteristics', function() {
    let bleDriver;
    let adapter;
    let bleDriverEventCallback = {};
    let connectEvent;

    beforeEach(function(done) {
        bleDriver = commonStubs.createBleDriver((eventCallback)=>{
            bleDriverEventCallback = eventCallback;
            connectEvent = commonStubs.createConnectEvent();
            done();
        });

        const adapterFactory = new AdapterFactory(bleDriver);
        adapter = adapterFactory.getAdapters().test;
        adapter.open({'baudRate': 115200, 'parity': 'none', 'flowControl': 'none'}, function(err) {});
    });

    it('should receive characteristics from events and callback', function (done) {
        const device = new Device('remote', 'peripheral');
        device.connectionHandle = 123;

        adapter._devices[device.instanceId] = device;

        adapter.getServices(device.instanceId, (err, services) => {
            adapter.getCharacteristics(services[0].instanceId, (err, characteristics) => {
                // TODO: Compare stuff?
                assert.equal(characteristics[0].uuid, '00002A00-0000-1000-8000-00805F9B34FB');
                assert.equal(characteristics[0].declarationHandle, 2);
                assert.equal(characteristics[0].valueHandle, 3);
                assert(_.isEqual(characteristics[0].value, [1,2,3]));

                assert.equal(characteristics[1].uuid, '00002A01-0000-1000-8000-00805F9B34FB');
                assert.equal(characteristics[1].declarationHandle, 4);
                assert.equal(characteristics[1].valueHandle, 5);
                assert(_.isEqual(characteristics[1].value, [4,5,6]));

                assert.equal(characteristics[2].uuid, '00002A04-0000-1000-8000-00805F9B34FB');
                assert.equal(characteristics[2].declarationHandle, 6);
                assert.equal(characteristics[2].valueHandle, 7);
                assert(_.isEqual(characteristics[2].value, []));

                done();
            });
        });

        bleDriverEventCallback([twoServiceDiscoveryEvent]);
        bleDriverEventCallback([zeroServiceDiscoveryEvent]);

        // TODO: will there exists a characteristicsAdded event? if yes compare received characteristics?
        //const characteristicsAddedSpy = sinon.spy();
        //adapter.on('serviceAdded', characteristicAddedSpy);

        //assert(!characteristicAddedSpy.called);

        assert(bleDriver.gattc_characteristic_discover.calledOnce);
        bleDriverEventCallback([twoCharacteristicDiscoveryEvent]);
        //assert(characteristicAddedSpy.calledTwice);
        assert(bleDriver.gattc_characteristic_discover.calledTwice);

        bleDriverEventCallback([oneCharacteristicDiscoveryEvent]);
        //assert(characteristicAddedSpy.calledThrice);
        assert(bleDriver.gattc_characteristic_discover.calledThrice);

        bleDriverEventCallback([zeroCharacteristicDiscoveryEvent]);
        //assert(characteristicAddedSpy.calledThrice);
        assert(bleDriver.gattc_characteristic_discover.calledThrice);

        assert(bleDriver.gattc_read.calledOnce);
        bleDriverEventCallback([firstValueCharacteristicReadEvent]);
        assert(bleDriver.gattc_read.calledTwice);
        bleDriverEventCallback([secondValueCharacteristicReadEvent]);
        assert(bleDriver.gattc_read.calledThrice);
        bleDriverEventCallback([thirdValueCharacteristicReadEvent]);
        assert(bleDriver.gattc_read.calledThrice);
    });

    it('should read the value if it receives unknown uuid type', function(done) {
        const device = new Device('remote', 'peripheral');
        device.connectionHandle = 123;

        adapter._devices[device.instanceId] = device;

        adapter.getServices(device.instanceId, (err, services) => {
            adapter.getCharacteristics(services[0].instanceId, (err, characteristics) => {
                assert.equal(characteristics[0].uuid, '00001234-0000-0000-0000-000000000000');
                assert.equal(characteristics[1].uuid, '00005678-0000-0000-0000-000000000000');
                done();
            });
        });

        bleDriverEventCallback([twoServiceDiscoveryEvent]);
        bleDriverEventCallback([zeroServiceDiscoveryEvent]);

        // TODO: will there exists a characteristicsAdded event? if yes compare received characteristics?
        //const characteristicsAddedSpy = sinon.spy();
        //adapter.on('serviceAdded', characteristicAddedSpy);

        //assert(!characteristicAddedSpy.called);

        assert(bleDriver.gattc_characteristic_discover.calledOnce);
        bleDriverEventCallback([firstUnknownUuidCharacteristicDiscoveryEvent]);
        //assert(characteristicAddedSpy.calledTwice);
        assert(bleDriver.gattc_characteristic_discover.calledTwice);

        bleDriverEventCallback([secondUnknownUuidCharacteristicDiscoveryEvent]);
        //assert(characteristicAddedSpy.calledThrice);
        assert(bleDriver.gattc_characteristic_discover.calledThrice);

        bleDriverEventCallback([zeroCharacteristicDiscoveryEvent]);
        //assert(characteristicAddedSpy.calledThrice);
        assert(bleDriver.gattc_characteristic_discover.calledThrice);

        assert(bleDriver.gattc_read.calledOnce);
        bleDriverEventCallback([firstUnkownUuidCharacteristicReadEvent]);
        assert(bleDriver.gattc_read.calledTwice);
        bleDriverEventCallback([firstValueCharacteristicReadEvent]);
        assert(bleDriver.gattc_read.calledThrice);
        bleDriverEventCallback([secondUnkownUuidCharacteristicReadEvent]);
        assert.equal(bleDriver.gattc_read.callCount, 4);
        bleDriverEventCallback([secondValueCharacteristicReadEvent]);
        assert.equal(bleDriver.gattc_read.callCount, 4);
    });
});
