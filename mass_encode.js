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
      util = require('util'),
      copyFile = util.promisify(fs.copyFile),
      readline = require('readline')

let inDir = path.normalize(process.argv[2]), // input dir
      outDir = path.normalize(process.argv[3]), // output dir
      codec = 'mp3'

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
// console.log('RUN: ' + findCmd)

exec(findCmd, options, async (error, stdout, stderr) => {
  if (error || stderr){
    console.error(`exec error: ${error || stderr}`)
    return
  }

  files = stdout.split('\n')
  files.splice(files.length - 1, 1) // last item is empty, delete

  //  warning if too much files, confirm path
  if (files.length > 100){
    // awaits user confirmation before proceeding.
    const confirm = await getConfirmation(`${files.length} files found in "${inDir}".\nConfirm processing? ([y]/n) `)
    if (!confirm){
      console.log('Confirmation denied, exit.')
      return false
    }
  }
  else
    console.log(`${files.length} files`)

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

    console.log('process: ' + file)

    // if dir not in cache, create it and update cache
    if (!createdDirCache[realOutputDir]){
      mkdirp.sync(realOutputDir)
      createdDirCache[realOutputDir] = 1
    }

    // flac file: convert it
    if (path.extname(file) === '.flac'){
      const cmd = `./${script} "${file}" "${realOutputDir}"`
      // console.log('RUN: ' + cmd)

      try{
        await runEncoder(cmd)
      }
      catch(ex){
        console.error(ex)
      }
    }
    else{
      // not flac, just copy file
      const base = path.basename(file),
            dest = `${realOutputDir}/${base}`
      // console.log('copy to' + dest)

      try{
        await copyFile(file, dest)
      }
      catch(ex){
        console.error(ex.stack)
      }
    }
    encodeOne()
  }
}

// wraps the call to encoder script in a promise
function runEncoder(cmd){
  return new Promise((resolve, reject) => {
    exec(cmd, options, (err, stdout, stderr) => {
      if (err)
        return reject(err)
      console.log(stderr) // show anyway, no output when no problem
      resolve()
    })
  })
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

// wait for user to input y, n or enter.
async function getConfirmation(message){
  return new Promise(async resolve => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })

    const validInputs = ['', 'y', 'n']
    var confirmation

    do{
      confirmation = await new Promise(resolve => {
        rl.question(message, (answer) => { resolve(answer) })
      })
    }
    while(validInputs.indexOf(confirmation) === -1)

    rl.close()
    resolve(confirmation !== 'n')
  })
}
