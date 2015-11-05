'use strict';

var  sinon = require('sinon');
var assert = require('assert');

var proxyquire = require('proxyquire');

var Adapter = require('../../api/adapter.js');
var AdapterFactory = require('../../api/adapterFactory');
var ServiceFactory = require('../../api/ServiceFactory');

const commonStubs = require('./commonStubs');

describe('adapter.setServices', function() {
    beforeEach(function() {
        this.clock = sinon.useFakeTimers();

        this.bleDriver = commonStubs.createBleDriver();

        /*
        this.bleDriver.gap_set_adv_data.yields(undefined);
        this.bleDriver.gap_start_advertisement.yields(undefined);
        this.bleDriver.gap_stop_advertisement.yields(undefined);
        */

        // Provide an array of adapters for the first call
        var adapterFactory = AdapterFactory.getInstance(this.bleDriver);

        // Sorry! The singleton keeps the first bleDriver it gets otherwise
        adapterFactory.clearForNextUnitTest(this.bleDriver);

        adapterFactory.getAdapters((err, adapters) => {
            this.adapter = adapters.test;
        });
        this.adapter.open({baudRate: 115211, parity: 'none', flowControl: 'uhh'}, function(err) {});
    });

    afterEach(function() {
        this.clock.restore();
    });

    it('with valid arguments should start advertising and emit adapterStateChange', function() {
        let stateChangeCallback = sinon.spy();
        let setServiceCallback = sinon.spy();

        this.adapter.on('adapterStateChanged', stateChangeCallback);

        let services = [];
        let serviceFactory = new ServiceFactory();
        let service = serviceFactory.createService('aabb');

        let characteristic = serviceFactory.createCharacteristic(service, 'be-ef', [1,2,3],
            {
//                uuid: 'be-ef', // Automatically determine type by uuid length (BT SIG: 16-bit, UUID: 128-bit)
//                value: [1, 2, 3], /* copies the value in value into memory managed by SD */
                maxLength: 3,
                readPerm: ['open'], /* can be ['encrypt,'mitm-protection'], ['signed','mitm-protection'] or ['no-access'] default is ['open'] */
                writePerm: ['encrypt'],
                properties: { /* BT properties */
                    broadcast: true,
                    read: true,
                    write: true,
                    writeWoResp: true,
                    reliableWrite: false,
                    notify: false,
                    indicate: true,
                },
            }
        );

        /*
        let descriptorA = serviceFactory.createDescriptor(characteristic, 'dd-dd-dd-dd');
        let descriptorB = serviceFactory.createDescriptor(characteristic, 'dd-ee-ee-dd');

        this.adapter.setServices(services, err => {
            assert.ifError(err);
            setServiceCallback();
        }); */

        //sinon.assert.calledOnce(setServicesCallback);
    });
});
