
import * as fs from 'fs'
import * as yargs from 'yargs'
import * as out from './output'
import * as MarkdownIt from 'markdown-it'
import * as cheerio from 'cheerio'
import * as path from 'path'
import * as fse from 'fs-extra'

const md = new MarkdownIt();

const args = yargs
    .option("input", {
        alias: "i",
        type: "string"
    })
    .option("output", {
        alias: "o",
        type: "string"
    })
    .option("template", {
        alias: "t",
        type: "string"
    })    
    .argv;

const sourceDir = args.input ? args.input : "./";
const templateDir = args.template ? args.template : null;
const backupTemplate = "./index.html"
const destinationDir = args.output ? args.output : "./";

const CONTENT_TARGET_ID = "content";
const NAVBAR_TARGET_ID = "navbox";

//read in an ordered list of .md files in sourceDir
const unfilteredSourceFiles = fs.readdirSync(sourceDir);

if(unfilteredSourceFiles.length == 0){
    out.err("Source directory " + sourceDir + " is empty.");
    process.exit(1);
}

//filter those that match s1_..., s2_..., s3_..., etc
const validFilenamePattern = /^s(?<index>[0-9]+)_[a-zA-Z0-9_-\s]+\.md$/;
const validFilenames = [];

for (let filename of unfilteredSourceFiles) {
    let match:RegExpExecArray = validFilenamePattern.exec(filename);
    if(match == null) {
        out.warn("'" + filename + "' is not a valid section filename and will be ignored.");
    }else{
        let startIndex = 0;
        let endIndex = validFilenames.length;
        let testIndex = Math.floor(startIndex + (endIndex - startIndex) / 2);
        let testElement:RegExpExecArray = validFilenames[testIndex]
        while(startIndex != endIndex){
            if(parseInt(testElement.groups.index) > parseInt(match.groups.index)){
                endIndex = parseInt(testElement.groups.index)
            }else if (parseInt(testElement.groups.index) < parseInt(match.groups.index)){
                startIndex = parseInt(testElement.groups.index)
            }else{
                out.err("'" + filename + "' and '" + testElement[0] + "' share the same index.");
                process.exit(1);
            }
            testIndex = Math.floor(startIndex + (endIndex - startIndex) / 2);
            testElement = validFilenames[testIndex]
        }
        validFilenames.splice(startIndex, 0, match);
    }
}


// exit if the list has missing ordinal items, starting with s1
for(let index = 0; index<validFilenames.length; ++index){
    let expectedSectionIndex = index + 1;
    let currentSectionIndex = parseInt(validFilenames[index].groups.index);
    if(expectedSectionIndex != currentSectionIndex){
        let difference = currentSectionIndex - expectedSectionIndex;
        if(difference > 1){
            out.err("Sections " + (expectedSectionIndex) + "-" + (currentSectionIndex - 1) + " are missing.");
        }else{
            out.err("Section " + (expectedSectionIndex) + " is missing.");
        }
        process.exit(1);
    }
}

let content = "";
let navbar = "";
//for each file, generate its HTML from md source. 
for(let filename of validFilenames){
    const fileContents = fs.readFileSync(path.join(sourceDir, filename[0]), "utf-8");
    let htmlRendered = md.render(fileContents);
    content += htmlRendered;

    let $ = cheerio.load(htmlRendered, {
        decodeEntities: true
    });
    let firstHeadings = $('h1');
    if(firstHeadings.length == 0){
        out.warn('Section ' + filename.groups.index + ' (' + filename[0] + ") does not have a heading.");
    }else{
        if(firstHeadings.length > 1){
            out.warn('Section ' + filename.groups.index + ' (' + filename[0] + ") has more than one <h1>.");
        }
        navbar += "<li>" + (firstHeadings[0] as any).children[0].data + "<li>";
    }
}

let templateFiles = templateDir ? fs.readdirSync(templateDir) : ["index.html"];
let rootTemplateDir = templateDir ? templateDir : "./";

if(!templateFiles.includes("index.html")){
    out.err("Unable to locate 'index.html' in template directory '" + rootTemplateDir + "'.");
}

let indexData = fs.readFileSync(path.join(rootTemplateDir, "index.html"), "utf-8");
let indexDom = cheerio.load(indexData, {
    decodeEntities: true
});

let contentDom = indexDom("#" + CONTENT_TARGET_ID);
if(contentDom.length != 1){
    out.err("The provided HTML template must include a singular #" + CONTENT_TARGET_ID + " element.");
    process.exit(1); 
}

let navboxDom = indexDom("#" + NAVBAR_TARGET_ID);
if(navboxDom.length != 1){
    out.err("The provided HTML template must include a singular #" + NAVBAR_TARGET_ID + " element.");
    process.exit(1); 
}

navboxDom.html(navbar);
contentDom.html(content);

if(!fs.existsSync(destinationDir)){
    fs.mkdirSync(destinationDir);
}

for(let templateFile of templateFiles){
    if(templateFile == "index.html"){
        let htmlString = indexDom.html({decodeEntities: true});
        fs.writeFileSync(path.join(destinationDir, "index.html"), htmlString);
    }else{
        fse.copy(path.join(rootTemplateDir, templateFile), path.join(destinationDir, templateFile));
    }
}