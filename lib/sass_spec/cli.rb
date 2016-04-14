require_relative 'engine_adapter'

module SassSpec::CLI
  require 'optparse'

  def self.parse
    options = {
      engine_adapter: SassEngineAdapter.new("sass"),
      spec_directory: nil,
      generate: false,
      tap: false,
      skip: false,
      verbose: false,
      filter: "",
      limit: -1,
      unexpected_pass: false,
      nuke: false,
      only_output_styles: []
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

      opts.on("-c", "--command COMMAND", "Sets a specific binary to run (defaults to '#{options[:engine_adapter]}')") do |v|
        options[:engine_adapter] = ExecutableEngineAdapater.new(v)
      end

      opts.on("-g", "--generate", "Run test(s) and generate expected output file(s).") do |v|
        options[:generate] = true
      end

      opts.on("--run-todo", "Run any tests marked as todo. Defaults to false.") do
        options[:run_todo] = true
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

      opts.on("--output-style STYLE", [:expanded, :compact, :nested, :compressed, :unspecified],
              "Only run tests that have the specified output style.",
              "Legal values: expanded, compact, nested, compressed, unspecified.") do |style|
        style = nil if style == :unspecified
        options[:only_output_styles] << style
      end

      opts.on("-r SPEC_DIR", "--root SPEC_DIR", "Root directory for the specs. ",
                "Defaults to the first directory specified if not provided or ",
                "the default spec directory if no directory is specified or if the first directory",
                "specified is a subdirectory of the default spec directory.") do |spec_dir|
        options[:spec_directory] = File.expand_path(spec_dir)
      end

      opts.on("-s", "--skip", "Skip tests that fail to exit successfully") do
        # Note: --skip is no longer necessary as this is now the default behavior, since we test for errors
      end

      opts.on("--nuke", "Write a new expected_output for every test from whichever engine we are using") do
        options[:nuke] = true
      end

      opts.on("--unexpected-pass", "When running the todo tests, flag as an error when a test passes which is marked as todo.") do
        options[:unexpected_pass] = true
      end

      opts.on("--silent", "Don't show any logs") do
        options[:silent] = true
      end
    end.parse!

    if ARGV.any? && !options[:spec_directory]
      if File.expand_path(ARGV[0]).start_with?(SassSpec::SPEC_DIR)
        options[:spec_directory] = SassSpec::SPEC_DIR
      else
        options[:spec_directory] = File.expand_path(ARGV[0])
      end
    end

    options[:spec_directory] ||= SassSpec::SPEC_DIR

    options[:spec_dirs_to_run] = ARGV.dup.map{|d| File.expand_path(d)} if ARGV.any?

    if options[:implementation] && options[:engine_adapter].respond_to?(:set_description)
      options[:engine_adapter].set_description(options[:implementation])
    end

    options
  end
end
