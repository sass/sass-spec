require 'minitest'
require 'pathname'
require_relative 'test'
require_relative 'test_case'


class SassSpec::Runner

  def initialize(options = {})
    @options = options
  end

  def run
    unless @options[:silent] || @options[:tap]
      puts "Recursively searching under directory '#{@options[:spec_directory]}' for test files to test '#{@options[:engine_adapter]}' with."
      puts @options[:engine_adapter].version
    end

    test_cases = _get_cases
    SassSpec::Test.create_tests(test_cases, @options)

    minioptions = []
    if @options[:verbose]
      minioptions.push '--verbose'
    end

    if @options[:tap]
      require 'minitap'
      Minitest.reporter = Minitap::TapY
    end

    exit Minitest.run(minioptions)
  end

  def _get_cases
    cases = []
    glob = File.join(@options[:spec_directory], "**", "#{@options[:input_file]}")
    Dir.glob(glob) do |filename|
      input = Pathname.new(filename)
      expected = Pathname.new(filename).dirname.join(@options[:expected_file])
      if File.file?(expected) && ! File.file?(expected.sub(/\.css$/, ".skip")) && filename.include?(@options[:filter])
        clean = File.file?(expected.sub(/\.css$/, ".clean"))
        cases.push SassSpec::TestCase.new(input.realpath(), expected.realpath(), "nested", clean, @options)
      end
      expanded = Pathname.new(filename).dirname.join(@options[:expanded_file])
      if File.file?(expanded) && ! File.file?(expanded.sub(/\.css$/, ".skip")) && filename.include?(@options[:filter])
        clean = File.file?(expanded.sub(/\.css$/, ".clean"))
        cases.push SassSpec::TestCase.new(input.realpath(), expanded.realpath(), "expanded", clean, @options)
      end
      compressed = Pathname.new(filename).dirname.join(@options[:compressed_file])
      if File.file?(compressed) && ! File.file?(compressed.sub(/\.css$/, ".skip")) && filename.include?(@options[:filter])
        clean = File.file?(compressed.sub(/\.css$/, ".clean"))
        cases.push SassSpec::TestCase.new(input.realpath(), compressed.realpath(), "compressed", clean, @options)
      end
      compact = Pathname.new(filename).dirname.join(@options[:compact_file])
      if File.file?(compact) && ! File.file?(compact.sub(/\.css$/, ".skip")) && filename.include?(@options[:filter])
        clean = File.file?(compact.sub(/\.css$/, ".clean"))
        cases.push SassSpec::TestCase.new(input.realpath(), compact.realpath(), "compact", clean, @options)
      end
    end
    cases
  end

end
