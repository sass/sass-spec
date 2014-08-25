require "open3"
require "versionomy"
# This represents a specific test case.
class SassSpec::TestCase
  def initialize(input_scss, expected_css, options = {})
    @input_path = input_scss
    @expected_path = expected_css
    @options = options
  end

  def name
    @input_path.dirname.to_s.sub(Dir.pwd + "/", "").gsub('/', '_')
  end

  def input_path
    @input_path
  end

  def expected_path
    @expected_path
  end

  # Test case scss files may have a special comment as their first line
  # specifying the versions to which the test applies, of the form:
  #
  # // VERSION=3.1.13,>3.2,<4.0.0
  #
  # Returns true if any version number listed matches the passed version,
  # or if all the listed versions with operators evaluate to true.
  #
  # That means operators > and < actually work like >= and <=.
  def applies_to_version?(version)
    versions = []
    File.foreach(@input_path){|v| versions = v.scan(/([<>]?)([0-9.]+)/); break }
    version = Versionomy.parse(version) unless versions.empty?

    versions.each do |v|
      v[1] = Versionomy.parse(v[1])
      return true if v[1] == version
    end
    versions.all? {|v| version.send(v[0] || '==', v[1]) }
  end

  def todo?
    @input_path.to_s.include? @options[:todo_path]
  end

  def output
    if @output
      return @output
    end
    stdout, stderr, status = Open3.capture3("#{@options[:sass_executable]} #{@input_path}")
    stdout = _clean_output(stdout)
    @output ||= [stdout, stderr, status]
  end

  def expected
    @expected ||= _clean_output File.read(@expected_path)
  end

  def _clean_output(css)
    css.gsub(/\s+/, "")
       .gsub("{", "{\n")
       .gsub(";", ";\n")
  end
end
