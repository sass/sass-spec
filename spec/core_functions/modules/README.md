This directory tests that core functions are accessible from the `sass:` modules
as defined in [the module system proposal][]. For the time being, it just tests
that each individual function is accessible with the correct name, and that
removed or renamed functions are not accessible. Once all implementations
support the module system, we should migrate all the function tests to use
module functions and just have simple tests for the global versions instead.

[the module system proposal]: https://github.com/sass/sass/blob/master/accepted/module-system.md#built-in-modules-1
