import type SpecDirectory from './spec-directory';
import path from 'path';

const HRX_SECTION_SEPARATOR = `
<===>
================================================================================
`;

async function getFilesHrx(
  dir: SpecDirectory,
  root: string,
  filenames: string[]
): Promise<string> {
  const fileSections = await Promise.all(
    filenames.map(async filename => {
      const contents = await dir.readFile(filename);
      const fullPath = path.resolve(dir.path, filename);
      const relPath = path.relative(root, fullPath);
      return `<===> ${relPath}\n${contents}`;
    })
  );
  return fileSections.join('\n');
}

async function getSubdirsHrx(
  dir: SpecDirectory,
  root: string
): Promise<string[]> {
  let sections: string[] = [];
  for (const subdir of await dir.subdirs()) {
    sections = sections.concat(await getHrxSections(subdir, root));
  }
  return sections;
}

async function getDirectFileHrx(
  dir: SpecDirectory,
  root: string
): Promise<string> {
  return await getFilesHrx(dir, root, await dir.listFiles());
}

/**
 * Get the subcontents of a non-test directory as HRX.
 * The first element of the returned array represents the direct files of the directory,
 * and each subsequent element corresponds to a subdirectory.
 */
async function getNormalDirHrx(
  dir: SpecDirectory,
  root: string
): Promise<string[]> {
  const directFiles = await getDirectFileHrx(dir, root);
  const subdirSections = await getSubdirsHrx(dir, root);
  return directFiles.length === 0
    ? subdirSections
    : [directFiles, ...subdirSections];
}

/**
 * Return the contents of a test directory as a single HRX section.
 *
 * The elements are printed in this order:
 *
 *  - options.yml (if present)
 *  - input.sass/.scss
 *  - any other files, including files in subdirectories
 *  - output files, including implementation-specific outputs
 *  - warning files, including implementation-specific warnings
 *  - error files, including implementation-specific errors
 */
async function getTestDirHrx(
  dir: SpecDirectory,
  root: string
): Promise<string> {
  const filenames = await dir.listFiles();
  const inputFile = filenames.find(filename =>
    /input\.s[ca]ss/.test(filename)
  )!;
  // TODO instead of sorting, just make sure the base output is written first
  const outputFiles = filenames
    .filter(name => name.startsWith('output-'))
    .sort();
  const warningFiles = filenames
    .filter(name => name.startsWith('warning'))
    .sort();
  const errorFiles = filenames.filter(name => name.startsWith('error')).sort();
  const otherFiles = filenames.filter(name => {
    return !/^(output|error|warning|input\.s[ac]ss|options\.yml)/.test(name);
  });
  const subdirSections = await getSubdirsHrx(dir, root);

  return [
    dir.hasFile('options.yml')
      ? await getFilesHrx(dir, root, ['options.yml'])
      : '',
    await getFilesHrx(dir, root, [inputFile]),
    await getFilesHrx(dir, root, otherFiles),
    subdirSections.join('\n'),
    dir.hasFile('output.css')
      ? await getFilesHrx(dir, root, ['output.css'])
      : '',
    await getFilesHrx(dir, root, outputFiles),
    await getFilesHrx(dir, root, warningFiles),
    await getFilesHrx(dir, root, errorFiles),
  ]
    .filter(str => str)
    .join('\n');
}

async function getHrxSections(
  dir: SpecDirectory,
  root: string
): Promise<string[]> {
  if (dir.isTestDir()) {
    return [await getTestDirHrx(dir, root)];
  } else {
    return getNormalDirHrx(dir, root);
  }
}

/**
 * Write the contents of this directory to an HRX file.
 */
export async function toHrx(dir: SpecDirectory): Promise<string> {
  const sections = await getHrxSections(dir, dir.path);
  return sections.join(HRX_SECTION_SEPARATOR);
}
