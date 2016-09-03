#!/bin/bash
set -v
export DIR=`pwd`

if [ "x$RUBY_SASS" = "xyes" ]; then
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

if [ "x$SASSC_SASS" = "xyes" ]; then
  export SASS_SPEC_PATH=$DIR
  git clone https://github.com/sass/libsass.git
  cd libsass && git submodule init && git submodule update && cd ..
  export SASS_LIBSASS_PATH=$DIR/libsass
  git clone https://github.com/sass/sassc.git
  cd sassc && git submodule init && git submodule update
  make || exit 1
  cd ..
  ruby sass-spec.rb -V $LANGUAGE_VERSION -c './sassc/bin/sassc' --impl 'libsass' || exit 1
fi
