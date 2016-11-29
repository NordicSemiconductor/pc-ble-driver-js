'use strict';

const adapterFactory = require('../setup').adapterFactory;

describe('Adapter', () => {

    it('opens an adapter and closes it without error', () => {
        return getAdapter()
            .then(adapter => {
                return Promise.resolve()
                    .then(() => openAdapter(adapter))
                    .then(() => closeAdapter(adapter));
            });
    });

});

function getAdapter() {
    return new Promise((resolve, reject) => {
        adapterFactory.getAdapters((error, adapters) => {
            if (error) {
                reject(error);
            } else if (Object.keys(adapters).length < 1) {
                reject('No adapters found.');
            } else {
                resolve(adapters[Object.keys(adapters)[0]]);
            }
        });
    });
}

function openAdapter(adapter) {
    return new Promise((resolve, reject) => {
        const options = {
            baudRate: 115200,
            parity: 'none',
            flowControl: 'none',
            enableBLE: false,
            eventInterval: 0,
        };

        adapter.open(options, error => {
            if (error) {
                reject(error);
            } else {
                adapter.enableBLE(null, error => {
                    error ? reject(error) : resolve();
                });
            }
        });
    });
}

function closeAdapter(adapter) {
    return new Promise((resolve, reject) => {
        adapter.close(error => {
            error ? reject(error) : resolve();
        });
    });
}
