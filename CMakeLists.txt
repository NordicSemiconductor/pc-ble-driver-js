cmake_minimum_required(VERSION 2.8)

# Name of the project (will be the name of the plugin)
project (pc-ble-driver-js)

if(APPLE)
    set(CMAKE_SKIP_BUILD_RPATH TRUE)
    set(CMAKE_BUILD_WITH_INSTALL_RPATH TRUE)
    set(CMAKE_INSTALL_RPATH "@loader_path")
endif()

set(BLE_DRIVER_INCLUDE_DIR ${CMAKE_CURRENT_SOURCE_DIR}/driver/include)
set(UECC_INCLUDE_DIR ${CMAKE_CURRENT_SOURCE_DIR}/src/uECC)

# Platform specific
if(MSVC)
    include(cmake/msvc.cmake)
elseif(APPLE)
    include(cmake/apple.cmake)
else()
    include(cmake/gcc.cmake)
endif()

add_subdirectory(driver)

# Essential include files to build a node addon,
# you should add this line in every CMake.js based project.
include_directories(${CMAKE_JS_INC} ${BLE_DRIVER_INCLUDE_DIR} ${UECC_INCLUDE_DIR})

# Specify source files
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

file (GLOB UECC_SOURCE_FILES
    "src/uECC/*.c"
)

if(WIN32)
    file(GLOB PLATFORM_SOURCE_FILES "src/win/*.c" "src/win/*.cpp" "src/serialadapter_win.cpp")
elseif(APPLE)
    file(GLOB PLATFORM_SOURCE_FILES "src/serialadapter_osx.cpp")
else()
    # Assume Linux
    file(GLOB PLATFORM_SOURCE_FILES "src/serialadapter_linux.cpp")
endif()

# Force .c files to be compiled with the C++ compiler
set_source_files_properties(
    ${UECC_SOURCE_FILES}
    PROPERTIES
    LANGUAGE CXX
)

# This line will tell CMake that we're building a shared library
# named after the project's name
add_library(${PROJECT_NAME} SHARED ${SOURCE_FILES} ${UECC_SOURCE_FILES} ${PLATFORM_SOURCE_FILES})

# This line will give our library file a .node extension without any "lib" prefix
set_target_properties(${PROJECT_NAME}
    PROPERTIES
    COMPILE_FLAGS "${CMAKE_CXX_FLAGS} -DBUILDING_NODE_EXTENSION"
    PREFIX ""
    SUFFIX ".node")

if(WIN32)
    include_directories("${CMAKE_JS_INC}/win")
    set_target_properties(${PROJECT_NAME} PROPERTIES COMPILE_DEFINITIONS "_CRT_SECURE_NO_WARNINGS")
elseif(APPLE)
    target_link_libraries(${PROJECT_NAME} "-framework CoreFoundation")
    target_link_libraries(${PROJECT_NAME} "-framework IOKit")
    set_property(TARGET ${PROJECT_NAME} PROPERTY MACOSX_RPATH ON)
else()
    # Assume Linux
    target_link_libraries(${PROJECT_NAME} "udev")
endif()

# Essential library files to link to a node addon,
# you should add this line in every CMake.js based project.
target_link_libraries(${PROJECT_NAME} ${CMAKE_JS_LIB} pc-ble-driver)
