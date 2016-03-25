module SassSpec
  SPEC_DIR = File.expand_path('../../spec', __FILE__)
end

require_relative 'sass_spec/annotate'
require_relative 'sass_spec/cli'
require_relative 'sass_spec/runner'
