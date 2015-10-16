'use strict';

var  sinon = require('sinon');
var assert = require('assert');

const Adapter = require('../../api/adapter.js');

describe('BLE_GAP_EVT_CONNECTED', function() {
    let bleDriver, adapter, bleDriverEventCallback, connectEvent;
    beforeEach(function() {
        bleDriver =
        {
            get_version: sinon.stub(),
            open: (options, err) => {},
            BLE_GAP_EVT_CONNECTED: 10,
        };

        let open = sinon.stub(bleDriver, 'open', (port, options, callback) => {
            bleDriverEventCallback = options.eventCallback;
            callback();
        });

        adapter = new Adapter(bleDriver, 'theId', 42);
        adapter.open({}, err => {
            assert.ifError(err);
        });

        connectEvent = {
            id: bleDriver.BLE_GAP_EVT_CONNECTED,
            conn_handle: 123,
            peer_addr: {address: 'FF:AA:DD'},
            role: 'BLE_GAP_ROLE_PERIPHERAL',
            conn_params: {
                min_conn_interval: 10,
                max_conn_interval: 100,
                slave_latency: 100,
                conn_sup_timeout: 455
            }
        };

    });

    it('should produce a deviceConnected event', () => {
        let connectSpy = sinon.spy();
        adapter.once('deviceConnected', connectSpy);
        
        bleDriverEventCallback([connectEvent]);

        assert(connectSpy.calledOnce);
    });

    it('should populate the adapters list of devices', () =>{
        bleDriverEventCallback([connectEvent]);

        let devices = adapter.getDevices();
        let addedDevice = devices['FF:AA:DD.123'];
        assert.notEqual(addedDevice, undefined);
    });

    it('should produce a device added event with data from connect event', () =>{
        let connectSpy = sinon.spy();
        adapter.once('deviceConnected', connectSpy);
        
        bleDriverEventCallback([connectEvent]);
        let device = connectSpy.args[0][0];

        assert.equal(device._instanceId, 'FF:AA:DD.123');
        assert.equal(device._address, 'FF:AA:DD');
        assert.equal(device._role, 'peripheral');
        assert.equal(device.connected, true);
        assert.equal(device._connectionHandle, connectEvent.conn_handle);
        assert.equal(device.minConnectionInterval, connectEvent.conn_params.min_conn_interval);
        assert.equal(device.maxConnectionInterval, connectEvent.conn_params.max_conn_interval);
        assert.equal(device.minConnectionInterval, connectEvent.conn_params.min_conn_interval);
        assert.equal(device.slaveLatency, connectEvent.conn_params.slave_latency);
        assert.equal(device.connectionSupervisionTimeout, connectEvent.conn_params.conn_sup_timeout);
        assert(connectSpy.calledOnce);
    });
});