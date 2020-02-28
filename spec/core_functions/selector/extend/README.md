Much of the complexity in the algorithm for extend comes from determining which
selectors are superselectors of which others and unifying two selectors, which
are covered more explicitly by specs for the `is-superselector()` and
`selector-unify()` functions, respectively. To avoid unnecessary duplication,
the specs for `selector-extend()` itself don't thoroughly exercise the
superselector or unification logic, and instead focuses on behavior that's
specific to the full extension process.
