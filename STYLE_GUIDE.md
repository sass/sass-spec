# Style Guide

Having a consistent style across all specs helps make them easier for a reader
to understand at a glance and easier for an author to focus on the behavior
being tested rather than the details of how the test is written. This guide
sets out the standard style that should be used for all new specs.

Note that specs written before this style guide probably don't follow it exactly
(or at all). If you're inspired to fix up old specs, you're very welcome to do
so!

Each guideline starts with one of these words:

* **DO** guidelines describe practices that should always be followed. There
  will almost never be a valid reason to stray from them.

* **DON'T** guidelines are the converse: things that are almost never a good
  idea.

* **PREFER** guidelines are practices that you should follow. However, there may
  be circumstances where it makes sense to do otherwise. Just make sure you
  understand the full implications of ignoring the guideline when you do.

* **AVOID** guidelines are the dual to "prefer": stuff you shouldn't do but
  where there may be good reasons to on rare occasions.

* **CONSIDER** guidelines are practices that you might or might not want to
  follow, depending on circumstances, precedents, and your own preference.

That specs that are testing inputs that violate these guidelines are, of course,
an exception. Thorough testing trumps style.

* [Organization](#organization)
  * [DO write specs in HRX files](#do-write-specs-in-hrx-files)
  * [DO use as few HRX files as possible for a given feature](#do-use-as-few-hrx-files-as-possible-for-a-given-feature)
  * [DON'T have HRX files longer than 500 lines or so](#dont-have-hrx-files-longer-than-500-lines-or-so)
  * [DO organize specs by which part of the language they test](#do-organize-specs-by-which-part-of-the-language-they-test)
  * [DO use descriptive paths](#do-use-descriptive-paths)
  * [DO put error specs in a separate "error" directory](#do-put-error-specs-in-a-separate-error-directory)
  * [PREFER underscore-separated paths](#prefer-underscore-separated-paths)
* [Testing](#testing)
  * [DO test only one thing per spec](#do-test-only-one-thing-per-spec)
  * [DO use type selectors as placeholders](#do-use-type-selectors-as-placeholders)
  * [DO use descriptive names for multiple placeholders](#do-use-descriptive-names-for-multiple-placeholders)
  * [DO use single-letter names for irrelevant placeholders](#do-use-single-letter-names-for-irrelevant-placeholders)
  * [DO use style rules for expression-level tests](#do-use-style-rules-for-expression-level-tests)
  * [PREFER making imported files partials](#prefer-making-imported-files-partials)
  * [DO name single imported or used files "other"](#do-name-single-imported-or-used-files-other)
  * [PREFER referring to issues when marking specs as `:todo`](#prefer-referring-to-issues-when-marking-specs-as-todo)
* [Documentation](#documentation)
  * [CONSIDER adding a comment explaining your spec](#consider-adding-a-comment-explaining-your-spec)
  * [CONSIDER adding README.md files to parent directories](#consider-adding-readme.md-files-to-parent-directories)
  * [DON'T write HRX comments](#dont-write-hrx-comments)
* [Formatting](#formatting)
  * [DO use comment dividers to separate specs within an HRX file](#do-use-comment-dividers-to-separate-specs-within-an-hrx-file)
  * [DO order files consistently](#do-order-files-consistently)
  * [DO use Dart Sass's output as the default](#do-use-dart-sasss-output-as-the-default)
  * [DO end each file with a newline](#do-end-each-file-with-a-newline)
  * [DO use two spaces for indentation](#do-use-two-spaces-for-indentation)
  * [DO use one-line rules when they contain empty children](#do-use-one-line-rules-when-they-contain-empty-children)
  * [PREFER one-line rules when they contain a single child with no children](#prefer-one-line-rules-when-they-contain-a-single-child-with-no-children)
  * [DON'T use one-line rules when they contain more than one child](#dont-use-one-line-rules-when-they-contain-more-than-one-child)
  * [DON'T use one-line rules when they contain grandchildren](#dont-use-one-line-rules-when-they-contain-grandchildren)

## Organization

### DO write specs in HRX files

<details>
<summary>Example</summary>

#### Good

`nesting.hrx`

```hrx
<===> single/input.scss
a {
  b {c: d}
}

<===> single/output.css
a b {
  c: d;
}
```

#### Bad

`nesting/single/input.scss`

```scss
a {
  b {c: d}
}
```

`nesting/single/output.css`

```css
a b {
  c: d;
}
```

</details>

All specs should be written in HRX files unless they contain invalid UTF-8
characters. HRX files make it easy for code reviewers to see the context of
specs they're reviewing.

### DO use as few HRX files as possible for a given feature

<details>
<summary>Example</summary>

#### Good

`nesting.hrx`

```hrx
<===> single/input.scss
a {
  b {c: d}
}

<===> single/output.css
a b {
  c: d;
}

<===>
================================================================================
<===> double/input.scss
a {
  b, c {d: e}
}

<===> double/output.css
a b, a c {
  d: e;
}
```

#### Bad

`nesting/single.hrx`

```hrx
<===> input.scss
a {
  b {c: d}
}

<===> output.css
a b {
  c: d;
}
```

`nesting/double.hrx`

```hrx
<===> input.scss
a {
  b, c {d: e}
}

<===> output.css
a b, a c {
  d: e;
}
```

</details>

Combining specs into as few HRX files as possible helps keep the repo clean and
easy to navigate, make it easier to see connections between related specs, and
encourages the creation of more smaller specs.

Note that specs *should not* be combined for unrelated features, and that HRX
files should be split apart if they become too large (see below).

### DON'T have HRX files longer than 500 lines or so

Very large HRX files can be as difficult to navigate as hundreds of tiny files.
Once an HRX file gets larger than about 500 lines, it's probably time to split
it into multiple files. To do so:

* Create a directory with the same name as the HRX files.
* Take all the top-level subdirectories in the HRX file and make them their own
  HRX files.
* If this creates too many small HRX files, consider combining some related
  files back into more coarse-grained sub-divisions.

### DO organize specs by which part of the language they test

<details>
<summary>Example</summary>

#### Good

`css/directives/keyframes.hrx`

```hrx
<===> bubble/empty/input.scss
// Regression test for sass/dart-sass#611.
a {
  @keyframes {/**/}
}

<===> bubble/empty/output.css
@keyframes {
  /**/
}
```

#### Bad

`regression/dart_sass_611.hrx`

```hrx
<===> input.scss
a {
  @keyframes {/**/}
}

<===> output.css
@keyframes {
  /**/
}
```

</details>

Specs should be organized into hierarchical directories based on what part of
the language they test, rather than other factors like how the test came to
exist, which implementations support it, and so on. If a spec covers the
intersection of multiple features, it can go in any of those features'
locations, based on which the spec writer feels most clearly communicates the
spec's meaning.

The following directories should be used for their corresponding language
features:

* `spec/css/` is for plain CSS features, including CSS at-rules like `@media`
  and plain-CSS selector syntax.

* `spec/core_functions/` is for built-in Sass functions. These functions should
  go in directories whose names correspond to the modules in [the module system
  proposal][]. For example, specs for the `rgb()` function go in
  `spec/core_functions/color/rgb/`.

  [the module system proposal]: https://github.com/sass/language/blob/master/accepted/module-system.md#built-in-modules-1

* `spec/directives` is for Sass's at-rules like `@extend` and `@import`.

* `spec/values/` is for SassScript value types.

### DO use descriptive paths

<details>
<summary>Example</summary>

#### Good

`css/keyframes.hrx`

```hrx
<===> bubble/empty/input.scss
// Regression test for sass/dart-sass#611.
a {
  @keyframes {/**/}
}

<===> bubble/empty/output.css
@keyframes {
  /**/
}
```

#### Bad

`basic/edge_case.hrx`

```hrx
<===> input.scss
a {
  @keyframes {/**/}
}

<===> output.css
@keyframes {
  /**/
}
```

</details>

The path to a spec, both inside and outside its HRX file, is the first place a
reader will look to try to understand [exactly what it's testing][]. Being as
descriptive as possible (without being too verbose) in your choice of names will
make this understanding much easier. Good rules of thumb include:

[exactly what it's testing]: #do-test-only-one-thing-per-spec

* Use noun phrases (like "keyframes") or adjectives (like "empty") that describe
  the feature being tested or the context or state it's in.

* Avoid placeholder names like "basic" or "simple". Sometimes it's best to
  describe *how* it's basic, like "empty" or "one_child". Other times, you can
  just forego the "basic" directory entirely and put your specs beneath the
  feature itself.

If you can't fully and tersely describe a spec with its name alone, [add a
comment][] to the beginning of the Sass file.

[add a comment]: #consider-adding-a-comment-explaining-your-spec

### DO put error specs in a separate "error" directory

<details>
<summary>Example</summary>

#### Good

```hrx
<===> single_value/input.scss
a {
  --b: c;
}

<===> single_value/output.css
a {
  --b: c;
}

<===>
================================================================================
<===> error/empty/input.scss
// CSS requires at least one token in a custom property.
.empty {
  --property:;
}

<===> error/empty/error
Error: Expected token.
  ,
3 |   --property:;
  |              ^
  '
  /sass/spec/css/custom_properties/error/empty/input.scss 3:14  root stylesheet
```

#### Bad

```hrx
<===> single_value/input.scss
a {
  --b: c;
}

<===> single_value/output.css
a {
  --b: c;
}

<===>
================================================================================
<===> empty/input.scss
// CSS requires at least one token in a custom property.
.empty {
  --property:;
}

<===> empty/error
Error: Expected token.
  ,
3 |   --property:;
  |              ^
  '
  /sass/spec/css/custom_properties/error/empty/input.scss 3:14  root stylesheet
```

</details>

All error specs for a given feature should go in an `error` directory (which is
often its own HRX file) directly beneath the root directory for the feature
being tested. They should *not* be intermingled with the feature's success case
specs. This helps keep the success specs focused on demonstrating the expected
behavior of the feature, while the error tests can cover all the disallowed edge
cases without getting in the way.

### PREFER underscore-separated paths

<details>
<summary>Example</summary>

#### Good

`css/min_max.hrx`

```hrx
<===> plain_css/nested_min_max/input.scss
a {
  b: min(max(1px, 2px)) max(min(1px, 2px));
}

<===> plain_css/nested_min_max/output.css
a {
  b: min(max(1px, 2px)) max(min(1px, 2px));
}
```

L#### Bad

`css/minMax.hrx`

```hrx
<===> plain-css/nested-min-max/input.scss
a {
  b: min(max(1px, 2px)) max(min(1px, 2px));
}

<===> plain-css/nested-min-max/output.css
a {
  b: min(max(1px, 2px)) max(min(1px, 2px));
}
```

</details>

Path names should be underscore-separated rather than hyphenated,
space-separated, or camel-cased. The only exception is when the path is
describing an existing Sass or CSS identifier that contains hyphens, such as
`font-face` or `scale-color`.

## Testing

### DO test only one thing per spec

<details>
<summary>Example</summary>

#### Good

```hrx
<===> transparent/input.scss
a {b: hsl(180, 60%, 50%, 0)}

<===> transparent/output.css
a {
  b: rgba(51, 204, 204, 0);
}

<===>
================================================================================
<===> opaque/input.scss
a {b: hsl(180, 60%, 50%, 1)}

<===> opaque/output.css
a {
  b: #33cccc;
}
```

#### Bad

```hrx
<===> input.scss
a {
  transparent: hsl(180, 60%, 50%, 0);
  opaque: hsl(180, 60%, 50%, 1);
}

<===> output.css
a {
  transparent: hsl(180, 60%, 50%, 1);
  opaque: #33cccc;
}
```

</details>

Each individual spec should focus on exactly one assertion of the behavior in
question. It's worth a bit of extra verbosity to ensure that it's always clear
exactly what each spec is testing. Otherwise, it's extremely difficult to
refactor specs because you don't know which of the dozen behaviors might not be
tested anywhere else. It also ensures that an implementation can mark an
individual assertion as `:todo` without also ceasing to test a bunch of
unrelated behavior.

### DO use type selectors as placeholders

<details>
<summary>Example</summary>

#### Good

```hrx
<===> transparent/input.scss
a {b: hsl(180, 60%, 50%, 0)}

<===> transparent/output.css
a {
  b: rgba(51, 204, 204, 0);
}
```

#### Bad

```hrx
<===> transparent/input.scss
.a {b: hsl(180, 60%, 50%, 0)}

<===> transparent/output.css
.a {
  b: rgba(51, 204, 204, 0);
}
```

</details>

When you need a style rule as context for something else, [like a test for an
expression][], the kind of selector you use for it doesn't matter. It's just
there as a placeholder to make the style rule valid. In that case, use a type
selector like `a` to avoid any unnecessary punctuation.

[like a test for an expression]: #do-use-style-rules-for-expression-level-tests

### DO use descriptive names for multiple placeholders

<details>
<summary>Example</summary>

#### Good

```hrx
<===> input.scss
extendee {a: b}

extender {
  @extend extendee;
}

<===> output.css
extendee, extender {
  a: b;
}
```

#### Bad

```
<===> input.scss
a {b: c}

d {
  @extend a;
}

<===> output.css
a, d {
  b: c;
}
```

</details>

If you have more than one placeholder selector (or more than one placeholder
property, etc) in the same test, give them explicit names to help make it clear
how the input maps to the output. These names should describe the role of the
placeholders (or their associated rules), or at least their original locations.

### DO use single-letter names for irrelevant placeholders

<details>
<summary>Example</summary>

#### Good

```hrx
<===> input.scss
a {b: c}

<===> output.css
a {
  b: c;
}
```

#### Bad

```hrx
<===> input.scss
@function global-function() {@return null}

global-function-exists {
  result: function-exists(global-function);
}

<===> output.css
global-function-exists {
  result: true;
}
```

</details>

If your placeholder identifiers *aren't* [repeated][], use single-letter names
in alphabetical order for them. The purpose of the spec should already be
communicated by [its path][], and it should only be testing [one thing][], so
there should be no need to add extra description to a single selector or
property name.

[repeated]: #do-use-descriptive-names-for-multiple-placeholders
[its path]: #do-use-descriptive-paths
[one thing]: #do-test-only-one-thing-per-spec

### DO use style rules for expression-level tests

<details>
<summary>Example</summary>

#### Good

```hrx
<===> transparent/input.scss
a {b: hsl(180, 60%, 50%, 0)}

<===> transparent/output.css
a {
  b: rgba(51, 204, 204, 0);
}
```

#### Bad

```hrx
<===> transparent/input.scss
@debug hsl(180, 60%, 50%, 0);

<===> transparent/output.css
<===> transparent/warning
/spec/core_functions/hsl/transparent/input.scss:1 Debug: rgba(51, 204, 204, 0)
```

</details>

When you're testing something at the expression level, like a function or an
arithmetic operation, write the expression as the right-hand side of a
declaration in a style rule. This will produce as little visual noise as
possible without tying your spec to the implementation-specific formatting of
`@warn` or `@debug`.

### PREFER making imported files partials

<details>
<summary>Example</summary>

#### Good

```hrx
<===> member/variable/input.scss
@import "other";

a {b: $c}

<===> member/variable/_other.scss
$c: d;

<===> member/variable/output.scss
a {
  b: d;
}
```

#### Bad

```hrx
<===> member/variable/input.scss
@import "other";

a {b: $c}

<===> member/variable/other.scss
$c: d;

<===> member/variable/output.scss
a {
  b: d;
}
```

</details>

When writing a spec with multiple files, make the files (other than `input.scss`
or `input.sass`) partials unless there's a concrete reason not to. This helps
make it clearer at a glance that they're additional input files, rather than
expectation files.

### DO name single imported or used files "other"

<details>
<summary>Example</summary>

#### Good

```hrx
<===> member/variable/input.scss
@import "other";

a {b: $c}

<===> member/variable/_other.scss
$c: d;

<===> member/variable/output.scss
a {
  b: d;
}
```

#### Bad

```hrx
<===> member/variable/input.scss
@import "imported";

a {b: $c}

<===> member/variable/_imported.scss
$c: d;

<===> member/variable/output.scss
a {
  b: d;
}
```

</details>

When a spec involves exactly two files, the file that's not `input.scss` should
be named "other" (`_other.scss`, `_other.sass`, etc).

### PREFER referring to issues when marking specs as `:todo`

<details>
<summary>Example</summary>

#### Good

```hrx
<===> slash_slash_string/options.yml
---
:todo:
- libsass # sass/libsass#2840

<===> slash_slash_string/input.scss
a {b: 1 / 2 / foo()}

<===> slash_slash_string/output.css
a {
  b: 1/2/foo();
}
```

#### Bad

```hrx
<===> slash_slash_string/options.yml
---
:todo:
- libsass

<===> slash_slash_string/input.scss
a {b: 1 / 2 / foo()}

<===> slash_slash_string/output.css
a {
  b: 1/2/foo();
}
```

</details>

When [marking a spec as `:todo`][], follow it with a comment that refers to an
issue in the implementation in question tracking the feature the spec tests. If
there isn't an issue yet, create one. Make sure to also link that issue back to
the specs for it!

[marking a spec as `:todo`]: README.md#todo

## Documentation
### CONSIDER adding a comment explaining your spec

<details>
<summary>Example</summary>

#### Good

```
<===> empty/input.scss
// CSS requires at least one token in a custom property.
.empty {
  --property:;
}

<===> empty/error
Error: Expected token.
  ,
3 |   --property:;
  |              ^
  '
  /sass/spec/css/custom_properties/error/empty/input.scss 3:14  root stylesheet
```

</details>

If the details of what your spec is testing and why it produces the output it
does wouldn't be clear to someone moderately familiar with Sass from [the spec's
path][] and a casual reading of the spec's contents, it's a good idea to add a
comment explaining in detail what's going on. This can also be useful for
elucidating the stranger corners of the CSS spec or Sass's language semantics.

[the spec's path]: #do-use-descriptive-paths

Explanatory comments should always be silent Sass comments. Loud comments and
HRX comments must not be used.

### DON'T write HRX comments

<details>
<summary>Example</summary>

#### Bad

```
<===>
CSS requires at least one token in a custom property.
<===> empty/input.scss
.empty {
  --property:;
}

<===> empty/error
Error: Expected token.
  ,
3 |   --property:;
  |              ^
  '
  /sass/spec/css/custom_properties/error/empty/input.scss 3:14  root stylesheet
```

</details>

HRX supports its own comment syntax, but that should never be used for specs.
Instead [use Sass comments][] to document an individual file or spec and
[`README.md` files][] to document entire directories. Sass comments provide more
flexibility to provide documentation for specific portions of the test files.

[use Sass comments]: #consider-adding-a-comment-explaining-your-spec
[`README.md` files]: #consider-adding-readme-md-files-to-parent-directories

### CONSIDER adding README.md files to parent directories

<details>
<summary>Example</summary>

#### Good

```hrx
<===> color/literal/README.md
When colors are written literally by the user, rather than being generated by a
function, `inspect()` should return them in the same format the user wrote them.

<===>
================================================================================
<===> color/literal/short_hex/input.scss
a {
  $result: inspect(#00f);
  result: $result;
  type: type-of($result);
}

<===> color/literal/short_hex/output.css
a {
  result: #00f;
  type: string;
}

<===>
================================================================================
<===> color/literal/long_hex/input.scss
a {
  $result: inspect(#0000ff);
  result: $result;
  type: type-of($result);
}

<===> color/literal/long_hex/output.css
a {
  result: #0000ff;
  type: string;
}
```

</details>

Like [adding a comment][] to an individual spec, add a `README.md` file to a
directory to explain something about all the specs that directory contains.
There's not currently a way to render the Markdown, but it provides a consistent
format that's easy to read in plain text.

[adding a comment]: #consider-adding-a-comment-explaining-your-spec

## Formatting
### DO use comment dividers to separate specs within an HRX file

<details>
<summary>Example</summary>

#### Good

```hrx
<===> single/input.scss
a {
  b {c: d}
}

<===> single/output.css
a b {
  c: d;
}

<===>
================================================================================
<===> double/input.scss
a {
  b, c {d: e}
}

<===> double/output.css
a b, a c {
  d: e;
}
```

#### Bad

```hrx
<===> single/input.scss
a {
  b {c: d}
}

<===> single/output.css
a b {
  c: d;
}

<===> double/input.scss
a {
  b, c {d: e}
}

<===> double/output.css
a b, a c {
  d: e;
}
```

</details>

Each subdirectory within an HRX file after the first should begin with [an HRX
comment][] containing 80 `=` characters:

[an HRX comment]: https://github.com/google/hrx/blob/master/README.md

```hrx
<===>
================================================================================
```

Because this is an HRX comment, it has no effect on the contents of the
directory. It just serves to visually separate specs from one another.

### DO order files consistently

<details>
<summary>Example</summary>

#### Good

```hrx
<===> top_level/options.yml
---
:warning_todo:
- libsass # sass/libsass#2834
:ignore_for:
- ruby-sass

<===> top_level/input.scss
$var: value !global;
a {b: $var}

<===> top_level/output.css
a {
  b: value;
}

<===> top_level/warning
DEPRECATION WARNING: As of Dart Sass 2.0.0, !global assignments won't be able to
declare new variables. Consider adding `$var: null` at the top level.

  ,
1 | $var: value !global;
  | ^^^^^^^^^^^^^^^^^^^
  '
    /sass/spec/variables/global/first_declaration/top_level/input.scss 1:1  root stylesheet
```

#### Bad

```hrx
<===> top_level/output.css
a {
  b: value;
}

<===> top_level/warning
DEPRECATION WARNING: As of Dart Sass 2.0.0, !global assignments won't be able to
declare new variables. Consider adding `$var: null` at the top level.

  ,
1 | $var: value !global;
  | ^^^^^^^^^^^^^^^^^^^
  '
    /sass/spec/variables/global/first_declaration/top_level/input.scss 1:1  root stylesheet

<===> top_level/options.yml
---
:warning_todo:
- libsass # sass/libsass#2834
:ignore_for:
- ruby-sass

<===> top_level/input.scss
$var: value !global;
a {b: $var}
```
k
</details>

To keep specs consistent, their constituent files should always be written in
the following order:

1. `options.yml`.
2. `input.scss` or `input.sass`.
3. Any files imported or used by `input.scss` or `input.sass`.
4. `output.css` or `error`
5. `warning`

If a spec has [implementation-specific expectations][], those expectations
should go directly after the corresponding default expectation.

[implementation-specific expectations]: README.md#implementation-specific-expectations

### DO use Dart Sass's output as the default

<details>
<summary>Example</summary>

#### Good

```hrx
<===> single_channel/input.scss
a {b: complement(#f00)}

<===> single_channel/output.css
a {
  b: aqua;
}

<===> single_channel/output-libsass.css
a {
  b: cyan;
}
```

#### Bad

```hrx
<===> single_channel/input.scss
a {b: complement(#f00)}

<===> single_channel/output.css
a {
  b: cyan;
}

<===> single_channel/output-dart-sass.css
a {
  b: aqua;
}
```

</details>

Since Dart Sass is the reference implementation, its output should be used as
`output.css`, and other implementations' outputs (if they differ) should be
written as [implementation-specific expectations][].

### DO end each file with a newline

<details>
<summary>Example</summary>

#### Good

```hrx
<===> single/input.scss
a {
  b {c: d}
}

<===> single/output.css
a b {
  c: d;
}
```

#### Bad

```hrx
<===> single/input.scss
a {
  b {c: d}
}
<===> single/output.css
a b {
  c: d;
}
```

</details>

Unless the lack of a trailing newline is specifically being tested, all
non-empty files should end in a trailing newline. For all but the last file in
an HRX archive, this appears as a full blank line.

### DO use two spaces for indentation

<details>
<summary>Example</summary>

#### Good

```hrx
<===> single/input.scss
a {
  b {c: d}
}

<===> single/output.css
a b {
  c: d;
}
```

#### Bad

```hrx
<===> single/input.scss
a {
	b {c: d}
}

<===> single/output.css
a b {
  c: d;
}
```

</details>

Always use two spaces for indentation unless you're explicitly testing behavior
for other whitespace.

### DO use one-line rules when they contain empty children

<details>
<summary>Example</summary>

#### Good

```hrx
<===> empty/input.scss
a {}

<===> empty/output.css
```

#### Bad

```hrx
<===> empty/input.scss
a {
}

<===> empty/output.css
```

</details>

### PREFER one-line rules when they contain a single child with no children

<details>
<summary>Example</summary>

#### Good

```hrx
<===> single/input.scss
a {
  b {c: d}
}

<===> single/output.css
a b {
  c: d;
}
```

#### Bad

```hrx
<===> single/input.scss
a {
  b {
    c: d;
  }
}

<===> single/output.css
a b {
  c: d;
}
```

</details>

When a rule contains a single child statement, such as a style rule that
contains a single declaration or a `@function` that just returns a value, it
should generally be written as a single line with no whitespace after `{` or
before `}`. However, if this would produce too long of a line or otherwise make
the rule difficult to read, it may be split onto multiple lines.

### DON'T use one-line rules when they contain more than one child

<details>
<summary>Example</summary>

#### Good

```hrx
<===> two_declarations/input.scss
a {
  b: c;
  d: e;
}

<===> two_declarations/output.css
a {
  b: c;
  d: e;
}
```

#### Bad

```hrx
<===> two_declarations/input.scss
a {b: c; d: e}

<===> two_declarations/output.css
a {
  b: c;
  d: e;
}
```

</details>

When a rule contains multiple child statements, each child must be written on
its own line. Each child that doesn't take a block must be followed by a
semicolon.

### DON'T use one-line rules when they contain grandchildren

<details>
<summary>Example</summary>

#### Good

```hrx
<===> single/input.scss
a {
  b {c: d}
}

<===> single/output.css
a b {
  c: d;
}
```

#### Bad

```hrx
<===> single/input.scss
a {b {c: d}}

<===> single/output.css
a b {
  c: d;
}
```

</details>

If a rule contains another rule which itself has children, the grandparent
should never be written on a single line.
