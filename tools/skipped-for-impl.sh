#!/bin/bash -e

# Exits with exit code 0 if the tests should be skipped for the current
# implementation, and exit code 1 otherwise. This allows pull requests to
# include e.g. "Skip dart-sass" if a connected Dart Sass pull request is also in
# flight. Multiple implementations can also be skipped: "Skip libsass,
# ruby-sass".

if [ "$TRAVIS_PULL_REQUEST" == "false" ]; then
  >&2 echo "TRAVIS_PULL_REQUEST: $TRAVIS_PULL_REQUEST."
  >&2 echo "Not skipping."
  exit 1
fi

>&2 echo "Fetching pull request $TRAVIS_PULL_REQUEST..."

JSON=$(curl -L -sS https://api.github.com/repos/sass/sass-spec/pulls/$TRAVIS_PULL_REQUEST)

RE_SKIP="[Ss]kip\>[a-z, -]*\<$IMPL"

if [[ $JSON =~ $RE_SPEC_PR ]]; then
  >&2 echo "Skipping $IMPL."
  exit 0
else
  >&2 echo "Pull request doesn't skip $IMPL."
  exit 1
fi
