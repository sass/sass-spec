require 'pathname'
require 'yaml'
module SassSpec
  class TestCaseMetadata
    def self.cache
      @metadata_cache ||= {}
    end

    ACCUMULATED_OPTIONS = [:todo, :expect_failure]

    attr_reader :options

    def initialize(test_case_dir, spec_dir = SassSpec::SPEC_DIR)
      @test_case_dir = Pathname.new(File.expand_path(test_case_dir))
      @spec_dir = Pathname.new(spec_dir)
      if @test_case_dir.relative_path_from(@spec_dir).to_s.start_with?("..")
        raise ArgumentError,
          "Test case #{test_case_dir} is not within the spec directory #{spec_dir}"
      end
      @options = resolve_options(@test_case_dir).freeze
    end

    def name
      @test_case_dir.relative_path_from(Pathname.new(Dir.pwd)).to_s
    end

    def _resolve_options(dir)
      return {} if dir.relative_path_from(@spec_dir).to_s == "."
      parent_options = resolve_options(dir.parent)
      options_file = dir + "options.yml"
      self_options = if options_file.exist?
                       YAML.load_file(options_file.to_s)
                     else
                       {}
                     end
      rv = parent_options.merge(self_options) do |key, parent_value, self_value|
        if ACCUMULATED_OPTIONS.include?(key)
          (Array(parent_value) + Array(self_value)).uniq
        else
          self_value
        end
      end
      rv
    end

    def resolve_options(dir)
      self.class.cache[dir] ||= _resolve_options(dir).freeze
    end

    def todo?(impl)
      @options[:todo] && @options[:todo].include?(impl)
    end

    def output_style
      @options[:output_style]
    end

    def precision
      @options[:precision]
    end

    def clean_output?
      !!@options[:clean]
    end

    def start_version
      unless @options[:start_version]
        raise ArgumentError.new("#{name} does not specify a start version.")
      end
      @start_version ||= Gem::Version.new(@options[:start_version])
    end

    def end_version
      unless defined?(@end_version)
        @end_version = if @options[:end_version]
                         Gem::Version.new(@options[:end_version])
                       else
                         nil
                       end
      end
      @end_version
    end

    def valid_for_version(version)
      valid = start_version <= version 
      if end_version
        valid &&= version <= end_version
      end
      valid
    end

  end
end
