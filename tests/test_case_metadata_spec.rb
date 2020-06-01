# frozen_string_literal: true

require_relative 'spec_helper'
require 'sass_spec'

def create_options_yaml(folder, dictionary)
  FileUtils.mkdir_p("tests/metadata/#{folder}")
  File.write("tests/metadata/#{folder}/options.yml", dictionary.to_yaml)
end

def cleanup(folder)
  FileUtils.remove_dir("tests/metadata/#{folder}")
end

def metadata(folder)
  SassSpec::TestCaseMetadata.new(SassSpec::Directory.new(folder))
end

describe SassSpec::TestCaseMetadata do
  context 'should ignore impl when given ignore_for' do
    before { create_options_yaml('ignore', ignore_for: ['dart_sass']) }
    after { cleanup('ignore') }
    subject { metadata('tests/metadata/ignore').ignore_for?('dart_sass') }
    it { is_expected.to be true }
  end

  context 'should ignore impl when given only_on' do
    before { create_options_yaml('only_on', only_on: ['dart_sass']) }
    after { cleanup('only_on') }
    subject { metadata('tests/metadata/only_on').ignore_for?('libsass') }
    it { is_expected.to be true }
  end

  context 'should have precision' do
    before { create_options_yaml('precision', precision: 10) }
    after { cleanup('precision') }
    subject { metadata('tests/metadata/precision').precision }
    it { is_expected.to eq 10 }
  end

  context 'should have todos for an impl' do
    before { create_options_yaml('todo', todo: ['sass/libsass#2342']) }
    after { cleanup('todo') }
    subject { metadata('tests/metadata/todo').todo?('libsass') }
    it { is_expected.to be true }
  end

  context 'should have warning todos for an impl' do
    before { create_options_yaml('warning', warning_todo: ['sass/libsass#2342']) }
    after { cleanup('warning') }
    subject { metadata('tests/metadata/warning').warning_todo?('libsass') }
    it { is_expected.to be true }
  end
end
