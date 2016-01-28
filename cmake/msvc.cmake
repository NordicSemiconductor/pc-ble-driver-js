message(STATUS "WIN32 build.")

add_definitions(
    -D_WIN32_WINNT=0x0502
)

set(Boost_USE_STATIC_LIBS ON)


