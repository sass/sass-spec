#!/bin/bash
set -v
export DIR=`dirname $0`

if [ "x$NODE_SASS" == "xyes" ]; then
  npm install || exit 1
  npm run start || exit 1
fi

if [ "x$RUBY_SASS" == "xyes" ];
  for GEMFILE in `ls $DIR/Gemfile*`
  do
    if [[ $GEMFILE != *"lock"* ]]
    then
      export BUNDLE_GEMFILE=$GEMFILE
      bundle install --no-deployment || exit 1
      bundle update sass || exit 1
      bundle exec sass-spec.rb || exit 1
    fi
  done
fi
