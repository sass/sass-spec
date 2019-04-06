require 'fileutils'
require 'pathname'
require 'rspec/temp_dir'

require 'sass_spec'

RSpec.describe SassSpec::Directory do
  include_context "uses temp dir"

  before(:each) do
    @old_pwd = Dir.pwd
    Dir.chdir temp_dir
  end
  after(:each) do
    Dir.chdir @old_pwd
  end

  context "at the working directory" do
    subject {SassSpec::Directory.new(temp_dir)}

    it {is_expected.not_to be_hrx}

    it "should have a nil parent" do
      expect(subject.parent).to be_nil
    end
  end

  context "above an HRX file" do
    before(:each) do
      FileUtils.mkdir_p("foo/bar/baz")
      File.write("foo/bar/baz/qux.hrx", <<END)
<===> zip/zap/input.scss
a {b: c}

<===> zip/zap/output.css
a {
  b: c;
}
END
    end

    subject {SassSpec::Directory.new("foo/bar")}

    it {is_expected.not_to be_hrx}

    it "should report its path relative to the working directory" do
      expect(subject.path).to be == Pathname.new("foo/bar")
    end

    it "should return its parent" do
      expect(subject.parent.path).to be == Pathname.new("foo")
    end

    context "#glob" do
    end
  end
end
