import path from "path"
import fs from "fs"
import child_process from "child_process"
import { Stream } from "stream"

const repo = path.resolve(process.cwd(), "../dart-sass/")

const fakeDartFile = `
import "dart:convert";
import "dart:io";

main() async {
  await for (var line in new LineSplitter().bind(utf8.decoder.bind(stdin))) {
    stdout.writeln(line);
    stdout.writeln(line.length);
  }
}
`

const dartFile = `
import "dart:convert";
import "dart:io";

import "${repo}/bin/sass.dart" as sass;

main() async {
  await for (var line in new LineSplitter().bind(utf8.decoder.bind(stdin))) {
    if (line.startsWith("!cd ")) {
      Directory.current = line.substring("!cd ".length);
      continue;
    }

    try {
      await sass.main(line.split(" ").where((arg) => arg.isNotEmpty).toList());
    } catch (error, stackTrace) {
      stderr.writeln("Unhandled exception:");
      stderr.writeln(error);
      stderr.writeln(stackTrace);
      exitCode = 255;
    }

    stdout.add([0xFF]);
    stdout.write(exitCode);
    stdout.add([0xFF]);
    stderr.add([0xFF]);
    exitCode = 0;
  }
}
`
let dartCompiler: child_process.ChildProcess

function initialize() {
  const dartFilename = "./thing.dart"
  fs.writeFileSync(dartFilename, dartFile, { encoding: "utf-8" })
  dartCompiler = child_process.spawn("dart", [
    "--enable-asserts",
    `--packages=${repo}/.packages`,
    dartFilename,
  ])
}

const libDir = path.resolve(__dirname, "spec")

initialize()

// const testPaths = ["spec/libsass/charset", "spec/libsass/css_unicode"]
// const testPaths = Array(5000).fill("spec/libsass/charset")
const testPaths = Array(10).fill("spec/libsass-closed-issues/issue_2446")

function splitSingle(buffer: Buffer, token: number) {
  const idx = buffer.indexOf(token)
  if (idx === -1) {
    return [buffer]
  } else {
    return [buffer.slice(0, idx), buffer.slice(idx + 1)]
  }
}

function split(buffer: Buffer, token: number) {
  const segments = []
  let [head, tail] = splitSingle(buffer, token)
  while (tail) {
    segments.push(head)
    const [head2, tail2] = splitSingle(tail, token)
    head = head2
    tail = tail2
  }
  segments.push(head)
  return segments
}

async function* toDartChunks(stream: typeof dartCompiler.stdout) {
  let buff = ""
  for await (const chunk of stream!) {
    const chunky: Buffer = chunk
    const [head, ...tail] = split(chunky, 0xff)
    yield buff + head.toString()
    if (tail.length > 0) {
      for (const item of tail.slice(0, tail.length - 1)) {
        yield item.toString()
      }
      buff = tail[tail.length - 1].toString()
    } else {
      buff = ""
    }
  }
}

const stdout = toDartChunks(dartCompiler!.stdout)
const stderr = toDartChunks(dartCompiler!.stderr)

async function compile(testPath: string) {
  const absPath = path.resolve(process.cwd(), testPath)
  dartCompiler.stdin!.write(`!cd ${absPath}\n`)
  dartCompiler.stdin!.write(`--no-color --no-unicode -I ${libDir} input.scss\n`)
  return {
    stdout: (await stdout.next()).value,
    stderr: (await stderr.next()).value,
    status: (await stdout.next()).value,
  }
}

async function runAll() {
  const start = Date.now()
  for (const path of testPaths) {
    const result = await compile(path)
    console.log(result)
  }
  const end = Date.now()
  console.log((end - start) / 1000)
  process.exit(0)
}

runAll()
// console.log("finished all test paths")
// readOutput()
