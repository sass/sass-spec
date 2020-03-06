Simple selector unification generally relies heavily on superselector logic for
determining when one selector can be omitted. Since this logic is already
thoroughly tested in `is-superselector()`, it's not duplicated here, other than
a few test cases to ensure that superselector logic is working at all.
