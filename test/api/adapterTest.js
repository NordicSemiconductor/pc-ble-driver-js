'use strict';

var  sinon = require('sinon');
var assert = require('assert');
var lolex = require('lolex');

var clock = lolex.install();

var proxyquire = require('proxyquire');

var adapterFactory = require('../../api/adapterFactory.js');

describe('AdapterFactory', function() {
    var bleDriver;

    beforeEach(function() {
        bleDriver =
        {
            get_adapters: sinon.stub()
        };
    });

    it('should provide a callback with list of adapters received from driver', function () {
        bleDriver.get_adapters.yields(undefined, [{ serialNumber: 'test1234', comNumber: '5' }]);
        let adapterFactoryInstance = new adapterFactory(bleDriver);

        let spy = sinon.spy();

        adapterFactoryInstance.on('added', spy);

        var adapters = adapterFactoryInstance.getAdapters();
        assert.equal(Object.keys(adapters).length, 1);
    });

    it('should provide an event when a new adapter is added to the computer', function() {
        var adapterA = { serialNumber: 'test1234', comNumber: '5' };
        bleDriver.get_adapters.yields(undefined, [adapterA]);

        let adapterFactoryInstance = new adapterFactory(bleDriver);

        let spy = sinon.spy();
        adapterFactoryInstance.on('added', spy);

        bleDriver.get_adapters.yields(undefined,
                    [
                        adapterA,
                        { serialNumber: 'test2222', comNumber: '6' }]
                    );

        clock.tick(5001);

        sinon.assert.calledOnce(spy);
    });

    it('should provide an event when an adapter is removed from the computer', function() {
        var adapterA = { serialNumber: 'test1234', comNumber: '5' };
        bleDriver.get_adapters.yields(undefined, [adapterA]);

        let adapterFactoryInstance = new adapterFactory(bleDriver);

        let spy = sinon.spy();
        adapterFactoryInstance.on('removed', spy);

        bleDriver.get_adapters.yields(undefined, []);
        clock.tick(5001);

        sinon.assert.calledOnce(spy);
    });
});