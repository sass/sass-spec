# encoding: utf-8

require 'pathname'
require 'command_line_reporter'

class SassSpec::Stats::Todo
  include CommandLineReporter

  def self.parse(args)
    options = {}
    parser = OptionParser.new
    parser.banner = "Usage: ./sass-spec.rb todo [filter]\n\nThis sub command prints stats on todos.\n\n"

    parser.on("--impl IMPLEMENTATION",
              "Find todos for implementation.") do |impl|
      if !["dart-sass", "libsass"].include? impl
        warn "Implementation must be one of [dart-sass, libsass].\n\n"
        warn parser.help()
        return nil
      end
      options[:impl] = impl
    end

    parser.on("--issue GITHUB_ISSUE",
              "Find todos corresponding to a Github issue in the form `dart-sass#123`.") do |issue|
      ["dart-sass", "libsass"].each do |impl|
        regex = Regexp.new("^#{impl}#\\d+$")
        if issue.match(regex)
          options[:issue] = issue
        end
      end

      if !options[:issue]
        warn "Invalid issue.\n\n"
        warn parser.help()
        return nil
      end
    end

    parser.on("--missing-issue", "Find todos that are missing a Github issue.") do
      options[:missing_issue] = true
    end

    parser.on("-h", "--help", "Print this help message.") do
      puts parser.help()
      return nil
    end

    parser.parse!(args)
    new(options)
  end

  def initialize(options)
    @options = options
  end

  def stats
    files = Dir.glob(File.join(SassSpec::SPEC_DIR, '**/*')).uniq

    if @options[:impl]
      todos_by_implementation(files, @options[:impl])
    elsif @options[:issue]
      todos_by_issue(files, @options[:issue])
    elsif @options[:missing_issue]
      todos_missing_issue(files)
    else
      todos(files)
    end
  end

  def todos_by_implementation(files, implementation)
    regexes = []
    if implementation == "dart-sass"
      dart_sass = Regexp.new(':todo:(?:\n- libsass)*?(?:\n- sass\/libsass)*?\n- sass\/dart-sass#\d+$', Regexp::MULTILINE)
      dart_sass_missing_issue = Regexp.new(':todo:(?:\n- libsass)*?(?:\n- sass\/libsass)*?\n- dart-sass$', Regexp::MULTILINE)
      regexes.push(dart_sass, dart_sass_missing_issue)
    elsif implementation == "libsass"
      libsass = Regexp.new(':todo:(?:\n- dart-sass)*?(?:\n- sass\/dart-sass)*?\n- sass\/libsass#\d+$', Regexp::MULTILINE)
      libsass_missing_issue = Regexp.new(':todo:(?:\n- dart-sass)*?(?:\n- sass\/dart-sass)*?\n- libsass$', Regexp::MULTILINE)
      regexes.push(libsass, libsass_missing_issue)
    end

    todos = find_todos(files, regexes)
    print_report(todos)
  end

  def todos_by_issue(files, issue)
    if issue =~ /dart-sass/
      regex = Regexp.new(':todo:(?:\n- dart-sass)*?(?:\n- sass\/dart-sass)*?\n- sass\/' + issue + '\d+$', Regexp::MULTILINE)
    elsif issue =~ /libsass/
      regex = Regexp.new(':todo:(?:\n- libsass)*?(?:\n- sass\/libsass)*?\n- sass\/' + issue + '$', Regexp::MULTILINE)
    end

    todos = find_todos(files, [regex])
    print_report(todos)
  end

  def todos_missing_issue(files)
    dart_sass = Regexp.new(':todo:(?:\n- libsass)*?(?:\n- sass\/libsass)*?\n- dart-sass$', Regexp::MULTILINE)
    libsass = Regexp.new(':todo:(?:\n- dart-sass)*?(?:\n- sass\/dart-sass)*?\n- libsass$', Regexp::MULTILINE)

    todos = find_todos(files, [dart_sass, libsass])
    print_report(todos)
  end

  def todos(files)
    dart_sass = Regexp.new(':todo:(?:\n- libsass)*?(?:\n- sass\/libsass)*?\n- sass\/dart-sass#\d+$', Regexp::MULTILINE)
    dart_sass_missing_issue = Regexp.new(':todo:(?:\n- libsass)*?(?:\n- sass\/libsass)*?\n- dart-sass$', Regexp::MULTILINE)
    libsass = Regexp.new(':todo:(?:\n- dart-sass)*?(?:\n- sass\/dart-sass)*?\n- sass\/libsass#\d+$', Regexp::MULTILINE)
    libsass_missing_issue = Regexp.new(':todo:(?:\n- dart-sass)*?(?:\n- sass\/dart-sass)*?\n- libsass$', Regexp::MULTILINE)

    todos = find_todos(files, [
      dart_sass,
      dart_sass_missing_issue,
      libsass,
      libsass_missing_issue,
    ])
    print_report(todos)
  end

  def find_todos(files, regexes)
    todos = {}

    files.each do |file|
      next unless [".hrx", ".yml"].include? File.extname(file)
      content = File.read(file)
      matches = regexes.flat_map do |regex|
        content.scan(regex)
      end

      next unless matches.length > 0
      path = Pathname.new(file).relative_path_from(Pathname.new(SassSpec::SPEC_DIR)).to_s
      todos[path] = []

      matches.uniq.each do |match|
        entry = {}
        if match =~ /dart-sass/
          impl = "dart-sass"
        elsif match =~ /libsass/
          impl = "libsass"
        end
        entry[:impl] = impl
        entry[:issue] = match =~ /#/ ? match.split("#")[-1] : "?"
        todos[path].push(entry)
      end
    end

    return todos
  end

  def print_report(todos)
    longest_path = 0
    todos.keys.each do |path|
      longest_path = [longest_path, path.length].max
    end

    summary = {
      dart_sass: 0,
      dart_sass_missing_issue: 0,
      libsass: 0,
      libsass_missing_issue: 0,
    }

    puts

    table(encoding: :ascii) do
      row(header: true) do
        column("Spec", width: longest_path)
        column("Impl", width: 10)
        column("Issue")
      end

      todos.each do |path, entries|
        entries.each do |entry|
          row do
            column(path)
            column(entry[:impl])
            column(entry[:issue])
          end

          if entry[:impl] == "dart-sass"
            if entry[:issue] == "?"
              summary[:dart_sass_missing_issue] += 1
            else
              summary[:dart_sass] += 1
            end
          elsif entry[:impl] == "libsass"
            if entry[:issue] == "?"
              summary[:libsass_missing_issue] += 1
            else
              summary[:libsass] += 1
            end
          end
        end
      end
    end

    puts

    table(encoding: :ascii) do
      row(header: true) do
        column("Summary", width: 30)
        column("Count")
      end

      if summary[:dart_sass] > 0
        row do
          column("dart-sass")
          column("#{summary[:dart_sass]}")
        end
      end

      if summary[:dart_sass_missing_issue] > 0
        row do
          column("dart-sass missing issue #")
          column("#{summary[:dart_sass_missing_issue]}")
        end
      end

      if summary[:libsass] > 0
        row do
          column("libsass")
          column("#{summary[:libsass]}")
        end
      end

      if summary[:libsass_missing_issue] > 0
        row do
          column("libsass missing issue #")
          column("#{summary[:libsass_missing_issue]}")
        end
      end

      row do
        column("total")
        column("#{todos.length}")
      end
    end
  end
end
