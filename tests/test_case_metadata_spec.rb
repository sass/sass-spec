require_relative 'spec_helper'
require 'sass_spec'

def create_options_yaml(folder, dictionary)
  FileUtils.mkdir_p("tests/fixtures/#{folder}")
  File.write("tests/fixtures/#{folder}/options.yml", dictionary.to_yaml)
end

def cleanup(folder)
  FileUtils.remove_dir("tests/fixtures/#{folder}")
end

describe SassSpec::TestCaseMetadata do
  context 'should ignore impl when given ignore_for' do
    before { create_options_yaml('ignore', ignore_for: ['dart_sass']) }
    after { cleanup('ignore') }
    subject { SassSpec::TestCaseMetadata.new(SassSpec::Directory.new('tests/fixtures/ignore')).ignore_for?('dart_sass') }
    it { is_expected.to be true }
  end

  context 'should ignore impl when given only_on' do
    before { create_options_yaml('only_on', only_on: ['dart_sass']) }
    after { cleanup('only_on') }
    subject { SassSpec::TestCaseMetadata.new(SassSpec::Directory.new('tests/fixtures/only_on')).ignore_for?('libsass') }
    it { is_expected.to be true }
  end

  context 'should have precision' do
    before { create_options_yaml('precision', precision: 10) }
    after { cleanup('precision') }
    subject { SassSpec::TestCaseMetadata.new(SassSpec::Directory.new('tests/fixtures/precision')).precision }
    it { is_expected.to eq 10 }
  end

  context 'should have todos for an impl' do
    before { create_options_yaml('todo', todo: ['sass/libsass#2342']) }
    after { cleanup('todo') }
    subject { SassSpec::TestCaseMetadata.new(SassSpec::Directory.new('tests/fixtures/todo')).todo?('libsass') }
    it { is_expected.to be true }
  end

  context 'should have warning todos for an impl' do
    before { create_options_yaml('warning', warning_todo: ['sass/libsass#2342']) }
    after { cleanup('warning') }
    subject { SassSpec::TestCaseMetadata.new(SassSpec::Directory.new('tests/fixtures/warning')).warning_todo?('libsass') }
    it { is_expected.to be true }
  end
end
