#!/bin/bash
set -v
export DIR=`dirname $0`


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

# TODO: Test libsass here
