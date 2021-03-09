
import * as fs from 'fs'
import * as yargs from 'yargs'

const argv = yargs
    .option("input", {
        alias: "i",
        type: "string"
    })
    .option("output", {
        alias: "o",
        type: "string"
    });

const sourceDir = argv.input ? argv.input : "./";
const destinationDir = argv.output ? argv.output : "./";

const CONTENT_TARGET_ID = "content";
const NAVBAR_TARGET_ID = "navbox";

//read in an ordered list of .md files in sourceDir s1_..., s2_..., s3_..., etc
const unfilteredSourceFiles = fs.readdirSync(sourceDir);

// throw an exception if the list has missing ordinal items or if none (correct formatted) are present

//for each file, generate its HTML from md source. 
//Grab the h1 and add it to navbar, grab all and add to running content.

//Append content to #content div

//Append headings to #navbox div

//write out HTML as string, plus contents of public folder, to destinationDir.