# pc-ble-driver-js

`pc-ble-driver-js` provides a Node.js interface to the C/C++ [pc-ble-driver](https://github.com/NordicSemiconductor/pc-ble-driver) library.

## Overview

`pc-ble-driver` allows an nRF5 connectivity chip running Nordic's SoftDevice to be controlled via serial port ([BLE Serialization](https://infocenter.nordicsemi.com/index.jsp?topic=%2Fcom.nordic.infocenter.sdk5.v12.0.0%2Flib_serialization.html)) by an application - enabling the application with complete BLE functionality. `pc-ble-driver-js` is higher-level than `pc-ble-driver` and leans towards 'convention over configuration'. Getting started is quick and easy. This module may be useful for tasks ranging from automated BLE testing to [desktop applications](https://www.nordicsemi.com/eng/Products/Bluetooth-low-energy/nRF-Connect-for-desktop) and BLE gateways in production.

## Installing

Installing `pc-ble-driver-js` requires a bit more than the usual `$ npm install` because of it's C/C++ `pc-ble-driver` dependency. For detailed guidelines on building and installing `pc-ble-driver-js` and it's dependencies see [Installation.md](./Installation.md).

## Getting started

The [examples](./examples) and [integration tests](./test) serve as a great starting point for development with `pc-ble-driver-js`. Examples include a [heart rate monitor](./examples/heart_rate_monitor.js) (BLE peripheral) and [heart rate collector](./examples/heart_rate_collector.js) (BLE master) and show the basic structure of an application built on `pc-ble-driver-js`. To run the heart rate monitor example, verify your nRF5 connectivity chip is set-up and connected to your PC and run:

    $ node examples/heart_rate_monitory.js
    
## Architecture

All functionality of `pc-ble-driver-js` is exposed through its [api](./api/). Other directories in `pc-ble-driver-js/` are for building, binding to C/C++, and testing, and a developer building an application on top of `pc-ble-driver-js` need not concern themselves with these details.

[Adapter](./api/adapter.js) is the core component of `pc-ble-driver-js`'s api. An `Adapter` sends serialized commands to the nRF5 connectivity chip, which in-turn executes the corresponding SoftDevice functionality. Any events the nRF5 connectivity chip receives from the SoftDevice are serialized and forwarded to the `Adapter`, which parses and handles these events.

An `Adapter`:

- Sends commands to the nRF5 connectivity chip
- Parses and handles events from the nRF5 connectivity chip
- Stores and organizes BLE related state
- Logs info with the specified verbosity

An `Adapter` does all this with a 'convention over configuration' approach, and this leads to a high-level api exposed to the developer. SoftDevice functionality is exposed by `Adapter` through a set of methods that often have default or optional parameters. Events are parsed and errors are checked for/handled by `Adapter` before being emitted for the application's use. BLE related state is maintained by `Adapter` and provided to the application through a simplified interface. This makes life easy for the developer, but in the (hopefully rare) case where finer control of the SoftDevice is required, this approach may be limiting. In this case the developer may need to create an issue, modify or extend `api/`, or if it makes sense, move to using [pc-ble-driver](https://github.com/NordicSemiconductor/pc-ble-driver) directly in a C/C++ environment.

Follow the [examples](./examples) and [integration tests](./test) for high-level best-practice use of `pc-ble-driver-js`.

## API Docs

https://NordicSemiconductor.github.io/pc-ble-driver-js/

## Contributing

We are currently working on a Contributor License Agreement (CLA), which will allow third party contributions to this project. We do not accept pull requests for the time being, but feel free to file code related issues on [GitHub Issues](https://github.com/NordicSemiconductor/pc-ble-driver-js/issues).

## License

See the [license file](LICENSE) for details.
