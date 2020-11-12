import "dart:convert";
import "dart:io";

main() async {
  await for (var line in new LineSplitter().bind(utf8.decoder.bind(stdin))) {
    stdout.write(line);
    stdout.write(line.length);
  }
}