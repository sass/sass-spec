# Spec Layout

This document describes the *desired* layout of the specs in this repo. Not all
specs have been migrated to this layout yet, but new specs should follow it.

As a general rule, spec directories should be singular and underscore-separated.

## Feature Layout

Specifications for each feature should live in a directory named after that
feature. Negative specs—those that produce fatal errors—should live in the
`error/` directory within that directory, with one assertion per spec.

Positive specs—those where compilation succeeds—should live in the feature
directory, possibly split into sub-directories if that's useful for
organization. Since each spec requires a large amount of boilerplate, positive
specs may contain multiple assertions. However, each spec should focus on one
aspect of the feature, even if that involves making multiple assertions. Having
higher granularity makes it easier for implementers to track progress on a
feature, and to understand failures when they occur.

For example:

```
spec/css/unicode_range/
|-- question_mark/
|   |-- input.scss
|   '-- expected_output.css
|-- range/
|   |-- input.scss
|   '-- expected_output.css
'-- error/
    |-- no_digits/
    |   |-- input.scss
    |   |-- error
    |   '-- status
    '-- too_many_hex_digits/
        |-- input.scss
        |-- error
        '-- status
```

## Global Layout

Features should be organized as follows:

* `spec/`

  The root directory for all specs.

  * `core_function/`

    Functions that are defined in the core Sass library. This should contain one
    directory for each function.

  * `css/`

    Specs whose source is valid plain CSS. Note that this doesn't include specs
    for values even when they're plain CSS; those belong in `value/`.

  * `value/`

    Specs for SassScript values. This includes values that are valid plain CSS,
    but does not include functions or operations on values (expect inasmuch as
    they're necessary to validate the parsing of value literals).

  * `indented/`

    Specs for the indented syntax. Only features that are parsed meaningfully
    differently between SCSS and the indented syntax need to have specs here.
