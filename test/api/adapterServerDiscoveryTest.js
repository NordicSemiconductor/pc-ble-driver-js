'use strict';

var  sinon = require('sinon');
var assert = require('assert');

var proxyquire = require('proxyquire');

var AdapterFactory = require('../../api/adapterFactory.js');
var Device = require('../../api/device.js');

const commonStubs = require('./commonStubs.js');


describe('getServices', function() {
    let bleDriver;
    let adapter;
    let bleDriverEventCallback = {};
    let connectEvent;

    let firstServiceDiscoveryEvent = {
        "id":48,
        "name":"BLE_GATTC_EVT_PRIM_SRVC_DISC_RSP",
        "conn_handle": 123,
        "count":3,
        "services":[
        {
            "uuid":{"uuid":6144,"type":1},
            "handle_range":{"start_handle":1,"end_handle":7}
        },
        {
            "uuid":{"uuid":6145,"type":1},
            "handle_range":{"start_handle":8,"end_handle":8}
        }
        ]
    };

    let secondServiceDiscoveryEvent = {
        "id":48,
        "name":"BLE_GATTC_EVT_PRIM_SRVC_DISC_RSP",
        "conn_handle": 123,
        "count":1,
        "services":[
        {
            "uuid":{"uuid":6153,"type":1},
            "handle_range":{"start_handle":9,"end_handle":12}
        }
        ]
    };

    let lastServiceDiscoveryEvent = {
        "id":48,
        "name":"BLE_GATTC_EVT_PRIM_SRVC_DISC_RSP",
        "conn_handle":123,
        "count":0,
        "services":[]
    };

    beforeEach(function(done) {
        bleDriver = commonStubs.createBleDriver((eventCallback)=>{
            bleDriverEventCallback = eventCallback;
            connectEvent = commonStubs.createConnectEvent();
            done();
        });

        var adapterFactory = new AdapterFactory(bleDriver);
        adapter = adapterFactory.getAdapters().test;
        adapter.open({'baudRate': 115200, 'parity': 'none', 'flowControl': 'none'}, function(err) {});
    });

    it('should receive services from events and a callback', function (done) {
        const device = new Device('remote', 'peripheral');
        device.connectionHandle = 123;

        adapter._devices[device.instanceId] = device;

        const serviceAddedSpy = sinon.spy();
        adapter.on('serviceAdded', serviceAddedSpy);

        adapter.getServices(device.instanceId, (err, services) => {
            const firstService = serviceAddedSpy.firstCall.args[0]
            const secondService = serviceAddedSpy.secondCall.args[0];
            const thirdService = serviceAddedSpy.thirdCall.args[0];

            assert.equal(services[0], firstService);
            assert.equal(services[1], secondService);
            assert.equal(services[2], thirdService);

            assert.equal(firstService.uuid, 6144);
            assert.equal(firstService.startHandle, 1);
            assert.equal(firstService.endHandle, 7);

            assert.equal(secondService.uuid, 6145);
            assert.equal(secondService.startHandle, 8);
            assert.equal(secondService.endHandle, 8);

            assert.equal(thirdService.uuid, 6153);
            assert.equal(thirdService.startHandle, 9);
            assert.equal(thirdService.endHandle, 12);

            done();
        });

        bleDriverEventCallback([firstServiceDiscoveryEvent, secondServiceDiscoveryEvent, lastServiceDiscoveryEvent]);

        assert(serviceAddedSpy.calledThrice);
    });
});
