'use strict'
/*******************************************************************************

 Takes all flac & jpg in input dir, copy or convert to output dir

 usage:
  node mass_encode.js [input] [output] [codec]

  - input: path where to take files
  - output: path to store new files
  - codec: codec to encode to. possible values: mp3, opus

*******************************************************************************/
const exec = require('child_process').exec,
      path = require('path'),
      fs = require('fs'),
      numCpus = require('os').cpus().length,
      mkdirp = require('mkdirp'),
      util = require('util')
      // copyFile = util.promisify(fs.copyFile)

let inDir = path.normalize(process.argv[2]), // input dir
      outDir = path.normalize(process.argv[3]), // output dir
      codec = process.argv[4]

let files, // array of files' path
    createdDirCache = {}

if (!inDir.endsWith(path.sep)) // add trailing slash for input dir
  inDir += path.sep
if (outDir.endsWith(path.sep)) // remove trailing slash for output dir
  outDir = outDir.substring(0, outDir.length - 1)

if (codec != 'mp3' && codec != 'opus'){
  return console.error('invalid codec ' + codec)
}

const options = {
  shell: '/bin/bash',
  maxBuffer: 200*1024*100 // make sur output buffer is wide enough
},
script = codec === 'mp3' ? 'encode_mp3' : 'encode_opus'

// find all files, filtering for flac & jpg
const findCmd =`find "${inDir}" -type f -iregex ".*[flac|jpg]$"`
console.log('RUN: ' + findCmd)

exec(findCmd, options, (error, stdout, stderr) => {
  if (error || stderr){
    console.error(`exec error: ${error || stderr}`)
    return
  }

  files = stdout.split('\n')
  files.splice(files.length - 1, 1) // last item is empty, delete
  console.log(`files: ${files.length}`)

  // TODO: warning if too much files, confirm path and action

  //  launch as many tasks as cores. Each one launches another when finished
  for (let i = 0; i< numCpus; i++){
    encodeOne()
  }
})

// exec convertion script
async function encodeOne(){
  if (files.length){
    const file = files.shift() // get a file path from array
    const realOutputDir = getOutputDir(file, outDir)

    // if dir not in cache, create it and update cache
    if (!createdDirCache[realOutputDir]){
      mkdirp.sync(realOutputDir)
      createdDirCache[realOutputDir] = 1
    }

    // console.log('output dir: ' + realOutputDir)

    if (path.extname(file) === '.flac'){
      const cmd = `./${script} "${file}" "${realOutputDir}"`
      console.log('RUN: ' + cmd)

      exec(cmd, options, (err, stdout, stderr) =>{
        if (err){
          console.log(`ERROR: ${err}`)
        }
        console.log(stderr)

      })
    }
    else{
      // TODO: just copy file
      console.log('copy to' + realOutputDir)
      const base = path.basename(file)

      // try{
      //   await copyFile(file, `${realOutputDir}/${base}`)
      // }
      // catch(ex){
      //   console.error(ex.stack)
      // }
    }
    encodeOne()
  }
}

// get output directory in which to write the file
function getOutputDir(file, outDir){
  let parentDir = path.dirname(file),
      sepIdx = parentDir.lastIndexOf(path.sep)

  parentDir = parentDir.substring(sepIdx + 1) // first index inclusive, +1 to exclude separator
  // console.log('parentDir: ' + parentDir)

  let realOutputDir
  if (outDir.endsWith(parentDir))
    realOutputDir = outDir
  else
    realOutputDir = `${outDir}/${parentDir}`

  return realOutputDir
}
