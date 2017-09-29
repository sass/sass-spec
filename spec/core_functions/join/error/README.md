As of 3.5, `join()` is unique in that it takes multiple optional arguments that
can be passed independently of one another. This may necessitate unusual
implementation, so we go out of our way to verify that it disallows invalid
calls.
