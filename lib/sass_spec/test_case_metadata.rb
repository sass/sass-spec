require 'pathname'
require 'yaml'

module SassSpec
  class TestCaseMetadata
    def self.cache
      @metadata_cache ||= {}
    end

    # If you change this, also change Annotate::CLI#annotate_path
    def self.merge_options(existing_opts, new_opts)
      existing_opts = existing_opts.dup

      new_opts.each do |key, value|
        if added_key = key[/^add_(.*)/, 1]
          added_key = added_key.to_sym
          (existing_opts[added_key] ||= [])
            .concat(value)
            .uniq!
        elsif removed_key = key[/^remove_((?:warning_)?todo)/, 1]
          removed_key = removed_key.to_sym
          (existing_opts[removed_key] ||= [])
            .delete_if {|name| value.include?(_normalize_todo(name))}
          existing_opts.delete(removed_key) if existing_opts[removed_key].empty?
        elsif removed_key = key[/^remove_(.*)/, 1]
          removed_key = removed_key.to_sym
          (existing_opts[removed_key] ||= [])
            .delete_if {|name| value.include?(name)}
          existing_opts.delete(removed_key) if existing_opts[removed_key].empty?
        elsif value.nil?
          existing_opts.delete(key)
        else
          existing_opts[key] = value
        end
      end

      existing_opts
    end

    ACCUMULATED_OPTIONS = [:todo, :warning_todo, :ignore_for, :ignore_warning_for, :only_on, :warning_only_on]

    attr_reader :options

    # The name of the test.
    #
    # This is a standardized format of the test's directory name.
    attr_reader :name

    # Parses metadata for the test case at the given SassSpec::Directory.
    def initialize(test_case_dir)
      @name = test_case_dir.to_s
      @options = resolve_options(test_case_dir)
    end

    def resolve_options(dir)
      self.class.cache[dir.path] ||= _resolve_options(dir).tap do |options|
        _normalize_todos(options, :todo)
        _normalize_todos(options, :warning_todo)
      end.freeze
    end

    def _resolve_options(dir)
      return {} unless parent = dir.parent

      parent_options = resolve_options(parent)
      self_options = if dir.file?("options.yml")
                       YAML.load(dir.read("options.yml"))
                     else
                       {}
                     end
      raise "#{dir.path}/options.yml is not a map!" unless self_options.is_a?(Hash)

      rv = parent_options.merge(self_options) do |key, parent_value, self_value|
        if ACCUMULATED_OPTIONS.include?(key)
          (Array(parent_value) + Array(self_value)).uniq
        else
          self_value
        end
      end
      rv
    end

    # Normalize a list of TODOs to convert GitHub issue references to
    # implementation names.
    def _normalize_todos(options, field)
      if options.include?(field)
        options[field] = options[field]
          .map {|name| self.class._normalize_todo(name)}
          .to_set
      end
    end

    # Normalize a single TODO value to convert a GitHub issue reference to an
    # implementation name.
    def self._normalize_todo(value)
      value =~ %r{^sass/(.*)#} ? $1 : value
    end

    def todo?(impl)
      @options[:todo] && @options[:todo].include?(impl)
    end

    def warning_todo?(impl)
      @options[:warning_todo] && @options[:warning_todo].include?(impl)
    end

    def all_warning_todos
      @options[:warning_todo] || []
    end

    def ignore_for?(impl)
      (@options[:ignore_for] && @options[:ignore_for].include?(impl)) ||
        (@options[:only_on] && !@options[:only_on].include?(impl))
    end

    def ignore_warning_for?(impl)
      (@options[:ignore_warning_for] && @options[:ignore_warning_for].include?(impl)) ||
        (@options[:warning_only_on] && @options[:warning_only_on].include?(impl))
    end

    def warnings_ignored_for
      @options[:ignore_warning_for] || []
    end

    def precision
      @options[:precision]
    end

    def output_style
      @options[:output_style]
    end

    def valid_for_impl?(impl)
      !ignore_for?(impl)
    end
  end
end
