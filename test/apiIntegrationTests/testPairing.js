'use strict'

const assert = require('assert');
const testLib = require('./testLibrary').singletonContainer.testLibrary;
const sinon = require('sinon');

//Use old style 'function' here or else this.timeout wonn't work
describe('Adapter pairing', function() {
    this.timeout(20000);

    it('should be possible to pair with a peer central', done => {
        let theDevice;
        testLib.startAdvertising()
        .then(() => {
            return testLib.waitForConnectedEvent();
        })
        .then((device) => {
            theDevice = device;
            return testLib.pairWithCentral(theDevice);
            });
        })
        .then(() => {
            done();
        })
        .catch(error => {
            console.log('error ');
            testLib.disconnect()
        }); 
    });
});