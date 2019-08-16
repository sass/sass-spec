require_relative 'spec_helper'
require 'sass_spec'

describe SassSpec::TestCaseMetadata do
  context 'should ignore impl when given ignore_for' do
    subject { SassSpec::TestCaseMetadata.new(SassSpec::Directory.new('tests/fixtures/test_case_metadata/ignore_dart_sass')).ignore_for?('dart_sass') }
    it { is_expected.to be true }
  end
end
