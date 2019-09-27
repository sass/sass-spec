These tests verify that `selector-parse()` accepts a wide range of input
structures and selector types.

We don't test the full gamut of possible inputs for every selector function
because it's assumed that they use the same parsing infrastructure, but they are
required to support all the same inputs as `selector-parse()`.
