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
let dartCompiler: ReturnType<typeof child_process.spawn>

function initialize() {
  const dartFilename = "./thing.dart"
  fs.writeFileSync(dartFilename, dartFile, { encoding: "utf-8" })
  // const { stdout } = child_process.spawnSync("dart", [dartFile], {
  //   encoding: "utf-8",
  // })
  // fs.unlinkSync(dartFile)
  // console.log(stdout)

  // return
  dartCompiler = child_process.spawn("dart", [
    "--enable-asserts",
    `--packages=${repo}/.packages`,
    dartFilename,
  ])
  // dartCompiler.stdout!.on("data", (data) => {
  //   console.log("data received")
  //   console.log(data.toString())
  // })
  dartCompiler.on("close", () => {
    console.log("dart compiler exited")
  })
}

const libDir = path.resolve(__dirname, "spec")

initialize()

// const testPaths = ["spec/libsass/charset", "spec/libsass/css_unicode"]
const testPaths = Array(5000).fill("spec/libsass/charset")

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
  return [(await stdout.next()).value, (await stdout.next()).value]
}

async function runAll() {
  const start = Date.now()
  for (const path of testPaths) {
    await compile(path)
    process.stdout.write(".")
  }
  const end = Date.now()
  console.log((end - start) / 1000)
  process.exit(0)
}

runAll()
// console.log("finished all test paths")
// readOutput()
