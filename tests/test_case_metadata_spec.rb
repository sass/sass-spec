require_relative 'spec_helper'
require 'sass_spec'

def create_options_yaml(dictionary)
  Dir.mkdir('tests/fixtures') unless Dir.exist?('tests/fixtures')
  File.write('tests/fixtures/options.yml', dictionary.to_yaml)
end

def cleanup
  FileUtils.remove_dir('tests/fixtures')
end

describe SassSpec::TestCaseMetadata do
  after(:each) { cleanup }

  context 'should ignore impl when given ignore_for' do
    before { create_options_yaml(ignore_for: ['dart_sass']) }
    subject { SassSpec::TestCaseMetadata.new(SassSpec::Directory.new('tests/fixtures')).ignore_for?('dart_sass') }
    it { is_expected.to be true }
  end
end
