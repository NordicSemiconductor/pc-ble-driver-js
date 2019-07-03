cmake_minimum_required(VERSION 3.12)

if(DEFINED ENV{VCPKG_ROOT} AND NOT DEFINED CMAKE_TOOLCHAIN_FILE)
  set(CMAKE_TOOLCHAIN_FILE "$ENV{VCPKG_ROOT}/scripts/buildsystems/vcpkg.cmake"
      CACHE STRING "")
endif()

# Name of the project (will be the name of the plugin)
project (pc-ble-driver-js)

set(CMAKE_CXX_STANDARD 14)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

find_package(nrf-ble-driver 4.1.1 REQUIRED)

if (NOT DEFINED CMAKE_JS_INC)
    message (
        FATAL_ERROR
        "-DCMAKE_JS_INC (plus -DCMAKE_JS_LIB on Windows) must be "
        "provided. To build this project, run `npm install` "
        "instead of running cmake directly."
    )
endif ()

set(UECC_INCLUDE_DIR ${CMAKE_CURRENT_SOURCE_DIR}/src/uECC)

file (GLOB SOURCE_FILES
    "src/adapter.cpp"
    "src/serialadapter.cpp"
    "src/common.cpp"
    "src/driver.cpp"
    "src/driver_gap.cpp"
    "src/driver_gatt.cpp"
    "src/driver_gattc.cpp"
    "src/driver_gatts.cpp"
    "src/driver_uecc.cpp"
    "src/*.h"
)

# Specify platform specific source files (include win_delay_load_hook.cpp only for Windows)
if(WIN32)
    file (GLOB PLATFORM_SOURCE_FILES
        "src/win_delay_load_hook.cpp"
    )
endif()

file (GLOB UECC_SOURCE_FILES
    "src/uECC/*.c"
)

# Force .c files to be compiled with the C++ compiler
set_source_files_properties(
    ${UECC_SOURCE_FILES}
    PROPERTIES
    LANGUAGE CXX
)

# Build the pc-ble-driver as a static library
add_definitions(
    -DPC_BLE_DRIVER_STATIC
)

# Compiler specific
if(MSVC)
    include(${CMAKE_CURRENT_LIST_DIR}/cmake/msvc.cmake)
elseif(APPLE)
    include(${CMAKE_CURRENT_LIST_DIR}/cmake/apple.cmake)
else()
    # Linux
    include(${CMAKE_CURRENT_LIST_DIR}/cmake/gcc.cmake)
endif()

# There are several nrf-ble-driver libraies corresponding to SoftDevices. They
# expose a common API with some difference in features available. For now, we
# statially link to each one we need be creating several libraries, and select
# which resulting functions to use in JS code. We need more than one because
# nRF51 devices are not supported by SoftDevices v3 and above, but we need later
# SoftDevices for features for nRF52.
#
# Compile a node library with SD API v2 for nRF51, and one with v3 for nRF52.
foreach(SD_API_VER "2" "3")
    set(CURRENT_TARGET pc-ble-driver-js-sd_api_v${SD_API_VER})

    add_library(${CURRENT_TARGET} SHARED ${SOURCE_FILES} ${UECC_SOURCE_FILES} ${PLATFORM_SOURCE_FILES})

    # This line will give our library file a .node extension without any "lib" prefix
    set_target_properties(${CURRENT_TARGET}
        PROPERTIES
        COMPILE_FLAGS "${CMAKE_CXX_FLAGS} -DBUILDING_NODE_EXTENSION"
        PREFIX ""
        SUFFIX ".node")

    set_target_properties(${CURRENT_TARGET} PROPERTIES COMPILE_OPTIONS -DNRF_SD_BLE_API_VERSION=${SD_API_VER})

    target_include_directories(${CURRENT_TARGET} PRIVATE ${CMAKE_JS_INC} ${UECC_INCLUDE_DIR})

    if(WIN32)
        # suppress C4251 v8/msvc related warning, for more info: https://github.com/nodejs/node/pull/15570
        set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} /wd4251")

        target_include_directories(${CURRENT_TARGET} PRIVATE "${CMAKE_JS_INC}/win")
        set_target_properties(${CURRENT_TARGET} PROPERTIES COMPILE_DEFINITIONS "_CRT_SECURE_NO_WARNINGS")

        # Electron requires delayloaded node.exe on Windows.
        # See https://electronjs.org/docs/tutorial/using-native-node-modules#a-note-about-win_delay_load_hook
        target_link_libraries(${CURRENT_TARGET} PRIVATE Delayimp.lib)
        set_target_properties(${CURRENT_TARGET} PROPERTIES LINK_FLAGS "/DELAYLOAD:node.exe" )
    elseif(APPLE)
        target_link_libraries(${CURRENT_TARGET} PRIVATE "-framework CoreFoundation")
        target_link_libraries(${CURRENT_TARGET} PRIVATE "-framework IOKit")
        set_property(TARGET ${CURRENT_TARGET} PROPERTY MACOSX_RPATH ON)
    else()
        # Assume Linux
        target_link_libraries(${CURRENT_TARGET} PRIVATE "udev")
    endif()

    target_link_libraries(${CURRENT_TARGET} PRIVATE ${CMAKE_JS_LIB} nrf::nrf_ble_driver_sd_api_v${SD_API_VER}_static)

    get_target_property(ble_driver_if_dir nrf::nrf_ble_driver_sd_api_v${SD_API_VER}_static INTERFACE_INCLUDE_DIRECTORIES)
    set(CONNECTIVITY_SD_API_V${SD_API_VER}_PATH "${ble_driver_if_dir}/../../share/nrf-ble-driver/hex/sd_api_v${SD_API_VER}/*.hex" CACHE FILEPATH "Path with wildcards to connectivity firmware files")
    file(GLOB_RECURSE connectivity_firmware ${CONNECTIVITY_SD_API_V${SD_API_VER}_PATH})

    set_property(
        TARGET ${CURRENT_TARGET}
        PROPERTY RESOURCE ${connectivity_firmware}
    )

    set(CMAKE_INSTALL_PREFIX ${CMAKE_CURRENT_SOURCE_DIR})
    install(
        TARGETS ${CURRENT_TARGET}
            RUNTIME DESTINATION "build/Release/"
            LIBRARY DESTINATION "build/Release/"
            RESOURCE DESTINATION "build/Release/pc-ble-driver/hex/"
    )
endforeach(SD_API_VER)
