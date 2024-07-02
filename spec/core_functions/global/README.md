This directory tests the global versions of the core functions that are
accessible from the `sass:` modules as defined in [the module system proposal].

It just tests that each individual function is accessible with the correct name,
as the actual implementations of these functions are already tested using the
`sass:` modules.

Note: Only the function being tested uses the global name here. `sass:` modules
may still be loaded to access other functions used as part of the test (e.g.
`meta.inspect()`).

[the module system proposal]: https://github.com/sass/sass/blob/master/accepted/module-system.md#built-in-modules-1
