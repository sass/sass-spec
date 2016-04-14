require "fileutils"
require "yaml"


# module FileUtils
#   extend self
# 
#   def mkdir_p(folder)
#     puts "mkdir -p #{folder}"
#   end
# 
#   def mv(from, to)
#     puts "mv #{from} #{to}"
#   end
# 
#   def cp(from, to)
#     puts "cp #{from} #{to}"
#   end
# end


%w(compact compressed expanded).each do |style|
  FileUtils.mkdir_p("spec/output_styles/#{style}")
  system("./sass-spec.rb annotate --output-style #{style} spec/output_styles/#{style}")
end

Dir.glob("spec/**/expected*") do |output|
  basename = File.basename(output)
  next if basename == "expected_output.css"
  puts "Processing: #{output}"
  output_style = nil
  clean = nil
  todo = nil
  if basename =~ /expected\.(compact|compressed|expanded|nested)\.(css|clean|skip)/
    output_style = $1
    clean = ($2 == "clean")
    todo = ($2 == "skip")
  else
    puts "Skipping: #{output}"
    next
  end
  folder = File.dirname(output)
  if File.exist?("#{folder}/error")
    puts "Skipping (error expected): #{output}"
    FileUtils.rm(output)
    next
  end
  input_file = Dir.glob("#{folder}/input.s[ac]ss").first
  unless input_file
    puts "Skipping (no input file): #{output}"
    next
  end
  new_folder = "spec/output_styles/#{output_style}/#{folder[5..-1]}"
  options = {}
  options[:clean] = true if clean
  options[:todo] = ["libsass", "sass"] if todo
  if (folder =~ /bourbon|todo|precision|104/)
    # These are not targeting whitespace output and they are problematic.
    puts "Removing: #{output}"
    FileUtils.rm(output)
    next
  end
  FileUtils.mkdir_p(new_folder)
  FileUtils.cp(input_file, "#{new_folder}/#{File.basename(input_file)}")
  FileUtils.mv(output, "#{new_folder}/expected_output.css")
  if options.any?
    yaml = options.to_yaml
    File.open("#{new_folder}/options.yml", "w") do |f|
      f.write(yaml)
    end
  end

end


%w(compact compressed expanded).each do |style|
  # system ""
  system "cp spec/libsass-closed-issues/issue_1103/_import.scss spec/output_styles/#{style}/libsass-closed-issues/issue_1103/"
  system "cp spec/sass/imported/imported.sass spec/output_styles/#{style}/sass/imported/"
  system "cp spec/libsass-closed-issues/issue_1081/_import.scss spec/output_styles/#{style}/libsass-closed-issues/issue_1081/"
  system "cp -r spec/basic/33_ambiguous_imports/blir spec/basic/33_ambiguous_imports/dir spec/basic/33_ambiguous_imports/dir.scss spec/output_styles/#{style}/basic/33_ambiguous_imports"
  system "cp -r spec/basic/14_imports/a.scss spec/basic/14_imports/b.scss spec/basic/14_imports/d.scss spec/basic/14_imports/sub spec/output_styles/#{style}/basic/14_imports/"
  system "cp spec/libsass-closed-issues/issue_279/foo.scss spec/output_styles/#{style}/libsass-closed-issues/issue_279/foo.scss"
  system "cp spec/libsass/selector-functions/is_superselector/_assert_helpers.scss spec/output_styles/#{style}/libsass/selector-functions/is_superselector"
  system "cp spec/selector-functions/is_superselector/_assert_helpers.scss spec/output_styles/#{style}/selector-functions/is_superselector/"
  # system "./sass-spec.rb annotate --precision 4 spec/output_styles/#{style}/libsass/precision/lower"
  # system "./sass-spec.rb annotate --precision 6 spec/output_styles/#{style}/libsass/precision/higher"
end
