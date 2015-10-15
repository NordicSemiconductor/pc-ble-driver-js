'use strict';

var  sinon = require('sinon');
var assert = require('assert');

var proxyquire = require('proxyquire');

var Adapter = require('../../api/adapter.js');
var AdapterFactory = require('../../api/adapterFactory.js');

describe('adapter.open', function() {
    beforeEach(function() {
        this.clock = sinon.useFakeTimers();

        this.bleDriver =
        {
            get_adapters: sinon.stub(),
            open: sinon.stub()
        };

        this.bleDriver.get_adapters.yields(undefined, [{ serialNumber: 'test', comName: '6' }]);

        // Provide an array of adapters for the first call
        var adapterFactory = new AdapterFactory(this.bleDriver);
        this.adapter = adapterFactory.getAdapters().test;
    });

    afterEach(function() {
        this.clock.restore();
    });

    it('with valid options should open the underlaying driver', function (done) {
        this.bleDriver.open.yieldsAsync(undefined);

        this.adapter.open({'baudRate': 115211, 'parity': 'none', 'flowControl': 'uhh'}, (err) => {
            if(err) {
                assert.fail('There should be no error');
            }

            sinon.assert.calledOnce(this.bleDriver.open);
            done();
        });

        var args = this.bleDriver.open.lastCall.args;

        assert.equal(args[0], '6');
        assert.equal(args[1].baudRate, 115211);
        assert.equal(args[1].parity, 'none');
        assert.equal(args[1].flowControl, 'uhh');
    });
});
