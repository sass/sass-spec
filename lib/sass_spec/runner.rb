require 'minitest'
require_relative 'test'
require_relative 'test_case'


class SassSpec::Runner

  def initialize(options = {})
    @options = options
  end

  def get_input_dirs
    (@options[:spec_dirs_to_run] || Array(@options[:spec_directory])).map do |d|
      d = File.expand_path(d)
      File.directory?(d) ? d : File.dirname(d)
    end
  end

  def get_input_files
    get_input_dirs.inject([]) do |m, d|
      m + Dir.glob(File.join(d, "**", "input.s[ac]ss"))
    end.uniq
  end

  def run
    unless @options[:silent] || @options[:tap]
      puts "Recursively searching under #{get_input_dirs.join(", ")} for test files to test '#{@options[:engine_adapter]}' against language version #{@options[:language_version]}."
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

    Minitest.run(minioptions)
  end

  def language_version
    unless defined?(@language_version)
      @language_version = if @options[:language_version]
                            Gem::Version.new(@options[:language_version])
                          else
                            warn "No language version specified. " +
                                 "Using #{SassSpec::MAX_LANGUAGE_VERSION}"
                            SassSpec::MAX_LANGUAGE_VERSION
                          end
    end
    @language_version
  end


  def _get_cases
    cases = []
    get_input_files().each do |filename|
      folder = File.dirname(filename)
      metadata = SassSpec::TestCaseMetadata.new(folder)
      unless metadata.valid_for_version(language_version)
        if @options[:verbose]
          warn "#{metadata.name} does not apply to Sass #{language_version}"
        end
        next
      end

      next unless filename.include?(@options[:filter] || "")

      if  @options[:only_output_styles] && @options[:only_output_styles].any?
        next unless @options[:only_output_styles].include?(metadata.output_style)
      end

      test_case = SassSpec::TestCase.new(folder, @options)

      unless File.exist?(test_case.expected_path)
        if @options[:verbose]
          warn "Expected output file missing. Skipping #{test_case.name}."
        end
        next
      end

      cases.push(test_case)
    end
    cases
  end

end
