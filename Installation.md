## Installation

To run `pc-ble-driver-js` you will first need to set up your nRF5 connectivity chip. You can find additional information here: [Hardware Setup](https://github.com/NordicSemiconductor/pc-ble-driver#hardware-setup).

Before installing `pc-ble-driver-js` you will need to have [Boost](http://www.boost.org/) installed. To install and compile Boost, please follow the instructions here: [Building Boost](https://github.com/NordicSemiconductor/pc-ble-driver#building-boost). Make sure you have built the Boost libraries for the architecture (32 or 64-bit) required by your Node installation.

### Submodule

This repository refers to the [pc-ble-driver](https://github.com/NordicSemiconductor/pc-ble-driver) library as a submodule. To ensure the submodule is downloaded when cloning `pc-ble-driver-js`, use:

    $ git clone --recursive <repository-url>

Or if you have already cloned this repository:

    $ git submodule update --init --recursive

### Dependencies

In addition to the dependencies and steps described above, the following Node/npm versions are required:

* Node.js (>=4.4.7)
* npm (>=3.7.0)

### Platform-specific

#### Windows

Configure cmake-js:

    $ npm config set cmake_CMAKE_GENERATOR:INTERNAL="Visual Studio 14 2015"
    $ npm config set cmake_BOOST_ROOT=c:\path\to\boost_x_xx_x

#### Ubuntu Linux and OS X/macOS

Configure cmake-js:

    $ npm config set cmake_BOOST_ROOT=/path/to/boost_x_xx_x

### Installation

Now you are ready to install `pc-ble-driver-js`:

    $ npm install

### Unit tests

Run unit tests to verify a successful installation:

    $ npm test
