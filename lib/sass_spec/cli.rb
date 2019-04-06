require_relative 'engine_adapter'

module SassSpec::CLI
  require 'optparse'

  def self.parse
    options = {
      engine_adapter: nil,
      spec_directory: nil,
      generate: false,
      tap: false,
      skip: false,
      verbose: false,
      filter: "",
      limit: -1,
    }

    OptionParser.new do |opts|
      opts.banner = "Usage: ./sass-spec.rb [options] [spec_directory...]

Examples:
  Run `sassc --style compressed input.scss`:
  ./sass-spec.rb -c 'sass --style compressed'

  Run tests only in the spec/basic folder:
  ./sass-spec.rb spec/basic

This script will search for all files under the spec (or specified) directory
that are named input.scss. It will then run a specified binary and check that
the output matches the expected output. If you want set up your own test suite,
follow a similar hierarchy as described in the initial comment of this script
for your test hierarchy.

This command can also be used to annotate tests to control which tests are ran
and when. For details: ./sass-spec.rb annotate -h

Make sure the command you provide prints to stdout.

"

      opts.on("-v", "--verbose", "Run verbosely") do
        options[:verbose] = true
      end

      opts.on("-V", "--version LANGUAGE_VERSION", "Select the Sass Language Version to test.") do |v|
        unless SassSpec::LANGUAGE_VERSIONS.include?(v)
          raise ArgumentError.new("Version #{v} is not valid. " +
                                  "Did you mean one of: #{SassSpec::LANGUAGE_VERSIONS.join(', ')}")
        end
        options[:language_version] = v
      end

      opts.on("-t", "--tap", "Output TAP compatible report") do
        options[:tap] = true
      end

      opts.on("-c", "--command COMMAND", "Sets a specific binary to run") do |v|
        options[:engine_adapter] = ExecutableEngineAdapter.new(v)
      end

      opts.on("--dart PATH", "Run Dart Sass, whose repo should be at the given path.") do |path|
        options[:engine_adapter] = DartEngineAdapter.new(path)
        options[:engine_adapter].args = options[:dart_args]
      end

      opts.on("--dart-args ARGS", "Pass ARGS to Dart Sass.") do |args|
        if (adapter = options[:engine_adapter]) && adapter.is_a?(DartEngineAdapter)
          adapter.args = args
        else
          options[:dart_args] = args
        end
      end

      opts.on("-g", "--generate", "Run test(s) and generate expected output file(s).") do
        options[:generate] = true
      end

      opts.on("--run-todo", "Run any tests marked as todo. Defaults to false.") do
        options[:run_todo] = true
      end

      opts.on("--probe-todo", "Run and report tests marked as todo that unexpectedly pass. Defaults to false.") do
        options[:probe_todo] = options[:run_todo] = true
      end

      opts.on("--impl NAME", "Sets the name of the implementation being tested. Defaults to 'sass'") do |name|
        options[:implementation] = name
      end

      opts.on("--filter PATTERN", "Run tests that match the pattern you provide") do |pattern|
        options[:filter] = pattern
      end

      opts.on("--limit NUMBER", "Limit the number of tests run to this positive integer.") do |limit|
        options[:limit] = limit.to_i
      end

      opts.on("--migrate-impl", "Copy tests that fail and make them pass for the current implementatino.") do
        options[:migrate_impl] = true
      end

      opts.on("--silent", "Don't show any logs") do
        options[:silent] = true
      end

      opts.on("--check-annotations", "Check if any test annotations are unecessary.") do
        options[:check_annotations] = true
      end

      opts.on("--interactive", "When a test fails, enter into a dialog for how to handle it.") do
        options[:interactive] = true
      end
    end.parse!

    raise "Must specify either --dart or --command." if options[:engine_adapter].nil?

    options[:spec_dirs_to_run] = ARGV.dup.map{|d| File.expand_path(d)} if ARGV.any?

    if options[:implementation] && options[:engine_adapter].respond_to?(:set_description)
      options[:engine_adapter].set_description(options[:implementation])
    end

    options
  end
end
