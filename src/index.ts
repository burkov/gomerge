#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import _ from 'lodash';
import assert from 'assert';
import chalk from 'chalk';
import commonp from "common-prefix";
import child_process from "child_process";

interface GoProFile {
  filename: string;
  chapter: number;
  number: number;
}

const parseFileName = (filename: string): GoProFile | undefined => {
  const re = /G[XH](?<chapter>\d{2})(?<number>\d{4})\.MP4/i;
  const result = filename.match(re);
  if (!result?.groups) return undefined;
  return {
    filename,
    chapter: parseInt(result.groups.chapter),
    number: parseInt(result.groups.number),
  };
};

const coloroizedLog = function (op: string, dest: string, src: string) {
  console.log(`${chalk.green(op)} to ${chalk.red(dest)} from ${chalk.blue(src)}`);
};

const renameFile = function ({ inputs, output }: Operation, dryRun: boolean = true) {
  assert(inputs.length === 1, 'more than one file requries merge, not renaming');
  const input = inputs[0];
  if (dryRun) coloroizedLog('Renaming', output, input);
  else fs.renameSync(input, output);
};

const mergeFiles = function ({ inputs, output }: Operation, dryRun = true, tmpDir = '/tmp') {
  assert(inputs.length > 1, 'you should use rename instead of merging');
  if (dryRun) {
    const common = commonp(inputs);
    const input = inputs.map(x => x.slice(common.length, -4)).join(',')
    coloroizedLog('Merging ', output, `${common}{${input}}.mp4`);
  } else {
    const demuxFile = `${output}.txt`;
    fs.writeFileSync(demuxFile, inputs.map(x => `file '${x}'`).join('\n'));
    child_process.execSync(`ffmpeg -f concat -safe 0 -i "${demuxFile}" -c copy "${output}"`, { stdio: 'inherit' })
    fs.unlinkSync(demuxFile);
    inputs.forEach(fs.unlinkSync);
  }
}


const targetDir = 'C:\\Users\\apbur\\todo\\200608 Krasnoe selo';

const files: GoProFile[] = fs
  .readdirSync(targetDir)
  .map(parseFileName)
  .filter((x) => x !== undefined) as GoProFile[];

interface Operation {
  inputs: string[];
  output: string;
}

const operations = _.sortBy(Object.entries(_.groupBy(files, 'number')), (x) => x[1].length).map(
  ([number, parts]) => {
    return {
      output: path.resolve(targetDir, `gopro_${String(number).padStart(4, '0')}.mp4`),
      inputs: parts.map((x) => path.resolve(targetDir, x.filename)).sort(),
    };
  },
);

operations.forEach((x) => {
  x.inputs.length > 1 ? mergeFiles(x, true, targetDir) : renameFile(x, true);
});



operations.forEach((x) => {
  x.inputs.length > 1 ? mergeFiles(x, false, targetDir) : renameFile(x, false);
});
