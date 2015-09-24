# Introduction
pc-ble-driver-js is a NodeJS AddOn for the pc-ble-driver library.

The AddOn does not support all of the functions in the pc-ble-driver library.

This is a very early implementation, we are working on making the AddOn production quality. 

When production quality is reached we will probably publish it on npmjs. Stay with us!

# Installation procedure

You need to have the cmake-js npm installed and the correct C++ compiler that matches your version of NodeJS.

# Platform specific notes

## WIN32

Copy the s130_nrf51_ble_driver.dll library to the repository root

## OSX

Set the DYLD_LIBRARY_PATH environment variable to a directory containing the libs130_nrf51_ble_driver.dylib library

# Run example

```
node example_scan.js
```
