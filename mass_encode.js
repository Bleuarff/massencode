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
      numCpus = require('os').cpus().length

var inDir = process.argv[2], // input dir
    outDir = process.argv[3], // output dir
    codec = process.argv[4],
    files // array of files' path

if (codec != 'mp3' && codec != 'opus'){
  console.error('invalid codec ' + codec)
}

var options = {
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

  //  launch as many tasks as cores. Each one launches another when finished
  for (let i = 0; i< numCpus; i++){
    encodeOne()
  }
})

// exec convertion script
function encodeOne(){
  if (files.length){
    let file = files.shift() // get a file path from array

    // TODO: create album folder and create files into it

    const cmd = `./${script} "${file}" "${outDir}"`
    console.log('RUN: ' + cmd)
    exec(cmd, options, (err, stdout, stderr) =>{
      if (err){
        console.log(`ERROR: ${err}`)
      }
      console.log(stderr)
      encodeOne()
    })
  }
}
