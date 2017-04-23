'use strict'

// takes all flac & jpg in input dir, copy or convert to output dir

const exec = require('child_process').exec,
    path = require('path'),
    numCpus = require('os').cpus().length

var inDir = process.argv[2], // input dir
    outDir = process.argv[3], // output dir
    files // array of files' path

// console.log(files)

var options = {
  shell: '/bin/bash',
  maxBuffer: 200*1024*100 // make sur output buffer is ok
}

// find all files, filtering for flac & jpg
exec(`find ${inDir} -type f -iregex ".*[flac|jpg]"`, options, (error, stdout, stderr) => {
  if (error || stderr) {
    console.error(`exec error: ${error || stderr}`);
    return;
  }

  files = stdout.split('\n')
  files.splice(files.length - 1, 1) // last item is empty, delete
  console.log(`files: ${files.length}`)
  // console.log(`stdout: ${stdout}`)
  // console.log(`stderr: ${stderr}`);
  loop()
})

// exec convertion script
function encodeOne(){
  if (files.length){
    let file = files.shift() // get a file path from array
    let child = exec(`./convert "${inDir}" "${outDir}" "${file}"`, options, (err, stdout, stderr) =>{
      if (err){
        console.log(`ERROR: ${err}`)
      }
      console.log(stderr)
      encodeOne()
    })
  }
}

function loop(){

  //  launch as many tasks as cores. Each one launches another when finished
  for (let i = 0; i< numCpus; i++){
    encodeOne()
  }
}
