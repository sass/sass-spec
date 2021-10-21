# sass-spec

### A cross-implementation [Sass][] test suite

* [Language Specs](#language-specs)
  * [Running Language Specs](#running-language-specs)
    * [Dart Sass](#dart-sass)
    * [LibSass](#libsass)
  * [Spec Structure](#spec-structure)
    * [HRX](#hrx)
    * [Specifying Warnings](#specifying-warnings)
    * [Implementation-Specific Expectations](#implementation-specific-expectations)
    * [Options](#options)
      * [`:todo`](#todo)
      * [`:warning_todo`](#warning_todo)
      * [`:ignore_for`](#ignore_for)
  * [Spec Style](#spec-style)
  * [Interactive Mode](#interactive-mode)
  * [Runner Tests](#runner-tests)
* [JS API Specs](#js-api-specs)
  * [Running JS API Specs](#running-js-api-specs)
    * [Dart Sass](#dart-sass-1)
    * [Embedded Host](#embedded-host)
  * [Implementation-Specific Expectations](#implementation-specific-expectations-1)

[Sass]: https://sass-lang.com

[![Build Status](https://travis-ci.org/sass/sass-spec.svg)](https://travis-ci.org/sass/sass-spec)

`sass-spec` is the official Sass test suite. It's used by all major Sass
implementations to ensure that they correctly implement the language.

## Language Specs

The bulk of this repository is taken up by language specs, which test how
accurately an implementation implements the Sass language. They live in the
`spec` directory.

### Running Language Specs

Before running specs, you'll need to install [Node.js] 14.14 or newer. Then, from the root of
this repo, run `npm install`.

[Node.j]: https://nodejs.org/en/download/

From there, it depends which implementation you're testing:

#### Dart Sass

To run specs against [Dart Sass][], the reference implementation of Sass that's
used for [the `sass` package][] on npm, you'll first need to install [Dart][].
Then run:

[Dart Sass]: https://sass-lang.com/dart-sass
[the `sass` package]: https://npmjs.com/package/sass
[Dart]: https://www.dartlang.org/

```sh
# If you already have a clone of the Dart Sass repo, you can use that instead.
git clone https://github.com/sass/dart-sass
(cd dart-sass; dart pub get)
export DART_SASS_PATH=`pwd`/dart-sass

npm run sass-spec -- --dart $DART_SASS_PATH
```

#### LibSass

To run specs against [LibSass][], the C++ Sass implementation that's used for
[Node Sass][] and other languages' Sass wrappers, you'll need to be able to
[build LibSass][]. Once you have all the build dependencies:

[LibSass]: https://sass-lang.com/libsass
[Node Sass]: https://npmjs.com/package/node-sass
[build LibSass]: https://github.com/sass/libsass/blob/master/docs/build.md

```sh
# If you already have a clone of the LibSass repo, you can use that instead.
git clone https://github.com/sass/libsass
(cd libsass; ./script/bootstrap; make sassc)
export SASSC_PATH=`pwd`/libsass/sassc/bin/sassc

npm run sass-spec -- --impl libsass -c $SASSC_PATH
```

### Spec Structure

Each spec is defined by a directory with an `input.scss` or `input.sass` file
and either:

* An `output.css` file, in which case the spec asserts that the Sass
  implementation compiles the input to the output. These specs are known as
  "success specs".
* An `error` file, in which case the spec asserts that the Sass implementation
  prints the error message to standard error and exits with a non-zero status
  code when it compiles the input. These specs are known as "error specs".

These files may also have [variants that are specific to individual
implementations][].

[variants that are specific to individual implementations]: #implementation-specific-expectations

The path to the spec serves as the spec's name, which should tersely describe
what it's testing. Additional explanation, if necessary, is included in a silent
comment in the input file. Specs may also contain additional files that are used
by the input file, as well as various other features which are detailed below.

#### HRX

Most specs are stored in [HRX files][], which are human-readable plain-text
archives that define a virtual filesystem. This format makes it easy for code
reviewers to see the context of specs they're reviewing. The spec runner treats
each HRX file as a directory with the same name as the file, minus `.hrx`. For
example:

[HRX files]: https://github.com/google/hrx#human-readable-archive-hrx

```hrx
<===> input.scss
ul {
  margin-left: 1em;
  li {
    list-style-type: none;
  }
}

<===> output.css
ul {
  margin-left: 1em;
}
ul li {
  list-style-type: none;
}
```

HRX archives can also contain directories. This allows us to write multiple
specs for the same feature in a single file rather than spreading them out
across hundreds of separate tiny files. By convention, we include an HRX comment
with 80 `=` characters between each spec to help keep them visually separate.
For example:

```hrx
<===> unbracketed/input.scss
a {b: is-bracketed(foo bar)}

<===> unbracketed/output.scss
a {b: false}

<===>
================================================================================
<===> bracketed/input.scss
a {b: is-bracketed([foo bar])}

<===> bracketed/output.scss
a {b: true}
```

Each HRX archive shouldn't be much longer than 500 lines. Once one gets too
long, its subdirectories should be split out into separate archives beneath a
physical directory. Conversely, if a given directory contains many small HRX
archives, they should be merged together into one larger file. This helps ensure
that the repo remains easy to navigate.

The only specs that *aren't* written in HRX format are those that include
invalid UTF-8 byte sequences. The HRX format is itself written in UTF-8, so it's
unable to represent the files in these specs.

#### Specifying Warnings

By default, Sass implementations are expected to emit nothing on standard error
when executing a success spec. However, if a `warning` file is added to the spec
directory, the spec will assert that the Sass implementation prints that warning
message to standard error as well as compiling the output. This is used to test
the behavior of the `@debug` and `@warn` rules, as well as various warnings
(particularly deprecation warnings) emitted by the Sass implementation itself.

Warnings can't be specified for error specs, since everything an implementation
emits on standard error is considered part of the error message that's validated
against `error`.

#### Implementation-Specific Expectations

Sometimes different Sass implementations produce different but equally-valid CSS
outputs or error messages for the same input. To accommodate this,
implementation-specific output, error, and warning files may be created by
adding `-dart-sass` or `-libsass` after the file's name (but before its
extension, in the case of `output.css`).

When a spec is running for an implementation with an implementations-specific
expectation, the normal expectation is ignored completely in favor of the
implementation-specific one. It's even possible (although rare) for one
implementation to expect an input file to produce an error while another expects
it to compile successfully.

#### Options

Metadata for a spec and options for how it's run can be written in an
`options.yml` file in the spec's directory. This file applies recursively to all
specs within its directory, so it can be used to configure many specs at once.
All options must begin with `:`.

All options that are supported for new specs are listed below. A few additional
legacy options exist that are no longer considered good style and will
eventually be removed.

#### `:todo`

```yaml
---
:todo:
- sass/libsass#2827
```

This option indicates implementations that should add support for a spec, but
haven't done so yet. When running specs for a given implementation, all specs
marked as `:todo` for that implementation are skipped by default. This ensures that
the build remains green while clearly marking which specs are expected to pass
eventually.

Implementations can be (and should be) specified as shorthand GitHub issue
references rather than plain names. This makes it easy to track whether the
implementation has fixed the issue, and to see which specs correspond to which
issue. When marking an issue as `:todo` for an implementation, please either
find an existing issue to reference or file a new one.

If the `--run-todo` flag is passed to `sass-spec.rb`, specs marked as `:todo`
for the current implementation will be run, and their failures will be reported.

If the `--probe-todo` flag is passed to `sass-spec.rb`, specs marked as `:todo`
for the current implementation will be run, but a failure will be reported *only
if those specs pass*. This is used to determine which specs need to have `:todo`
removed once a feature has been implemented. This can be used in combination
with [`--interactive`](#interactive-mode) to automatically remove `:todo`s for
these specs.

##### `:warning_todo`

```yaml
---
:warning_todo:
- sass/libsass#2834
```

This option works like [`:todo`](#todo), except instead of skipping the entire
test for listed implementations it only skips validating [that spec's
warnings](#specifying-warnings). The rest of the spec is run and verified as
normal. This should not be used for error specs.

##### `:ignore_for`

```yaml
---
:ignore_for:
- libsass
```

This option indicates implementations that are never expected to be compatible
with a given spec. It's used for specs for old features that some but not all
implementations have dropped support for.

[which is deprecated]: http://sass.logdown.com/posts/7081811

### Spec Style

The specs in this repo accumulated haphazardly over the years from contributions
from many different people, so there's not currently much by way of unified
style or organization. However, all new specs should follow the [style
guide](STYLE_GUIDE.md), and old specs should be migrated to be style-guide
compliant whenever possible.

### Interactive Mode

If you pass `--interactive` to `npm run sass-spec`, it will run in interactive
mode. In this mode, whenever a spec would fail, the spec runner stops and
provides the user with a prompt that allows them to inspect the failure and
determine how to handle it. This makes it easy to add [implementation-specific
expectations][] or mark specs as [`:todo`](#todo). For example:

```
In test case: spec/core_functions/color/hsla/four_args/alpha_percent
Output does not match expectation.
i. Show me the input.
d. show diff.
O. Update expected output and pass test.
I. Migrate copy of test to pass on libsass.
T. Mark spec as todo for libsass.
G. Ignore test for libsass FOREVER.
f. Mark as failed.
X. Exit testing.
```

[implementation-specific expectations]: #implementation-specific-expectations

Any option can also be applied to all future occurences of that type of failure
by adding `!` after it. For example, if you want to mark *all* failing specs as
`:todo` for the current implementation you'd type `I!`.

### Runner Tests

The unit tests for the spec runner are located in the `test/` directory. To run
these unit tests, run:

```sh
npm run test
```

## JS API Specs

In addition to the Sass language itself, the Sass specification describes a
[JavaScript API] that should be used when exposing a Sass implementation in
JavaScript. This repository also contains tests for the JavaScript API, located
in the `js-api-spec` directory.

[JavaScript API]: https://github.com/sass/sass/blob/main/spec/js-api/index.d.ts

### Running JS API Specs

JS API specs are run using `npm run js-api-spec`. It takes two mandatory
arguments:

* `--sassSassRepo`: The path to a clone of the [Sass language specification
  repository]. This is used to load the type declarations for the JavaScript
  API, whose canonical form is written as part of the specification.

* `--sassPackage`: The path to the npm package to test. This package should
  expose an implementation of the Sass JavaScript API.

[Sass language specification repository]: https://github.com/sass/sass

The JS API specs are run using [Jest], so you can also pass any [Jest command
line arguments] to `npm run js-api-spec`.

[Jest]: https://jestjs.io/
[Jest command line arguments]: https://jestjs.io/docs/cli

#### Dart Sass

To run specs against [Dart Sass], the reference implementation of Sass that's
used for [the `sass` package] on npm, you'll first need to install [Dart]. Then
run:

```sh
# If you already have a clone of the Sass language repo, you can use that
# instead.
git clone https://github.com/sass/sass
export SASS_SASS_PATH=`pwd`/sass

# If you already have a clone of the Dart Sass repo, you can use that instead.
git clone https://github.com/sass/dart-sass
(
  cd dart-sass
  dart pub get
  dart run grinder pkg-npm-dev
)
export DART_SASS_PATH=`pwd`/dart-sass

npm run sass-spec -- --sassSass $SASS_SASS_PATH --sassPackage $DART_SASS_PATH/build/npm
```

Whenever you modify Dart Sass, make sure to re-run `dart run grinder
pkg-npm-dev` to rebuild the JavaScript output.

#### Embedded Host

To run specs against [the Node Embedded Host], which embeds Dart Sass as a
subprocess for increased performance and is available as [the `sass-embedded`
package] on npm, you'll first need to install [Dart]. Then run:

[the Node Embedded Host]: https://github.com/sass/embedded-host-node
[the `sass-embedded` package]: https://npmjs.com/package/sass-embedded

```sh
# If you already have a clone of the Sass language repo, you can use that
# instead.
git clone https://github.com/sass/sass
export SASS_SASS_PATH=`pwd`/sass

# If you already have a clone of the Dart Sass repo, you can use that instead.
git clone https://github.com/sass/embedded-host-node
(
  cd embedded-host-node
  npm install
  npm run init
  npm run compile
)
export SASS_EMBEDDED_PATH=`pwd`/embedded-host-node

npm run sass-spec -- --sassSass $SASS_SASS_PATH --sassPackage $SASS_EMBEDDED_PATH
```

Whenever you modify the Sass embedded host, make sure to re-run `npm run
compile` to rebuild the JavaScript output.

### Implementation-Specific Expectations

The `js-api-spec/utils.ts` file exposes a `sassImpl` getter that returns the
name of the implementation (at time of writing, either `'dart-sass'` or
`'sass-embedded`'). You can use this field to give specs different behavior for
different implementations if necessary.

The utils file also exposes a `skipForImpl()` function, which skips an entire
block of specs for an implementation. This is typically used when testing
behavior that isn't yet supported by all implementations.
