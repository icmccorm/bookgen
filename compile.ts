
import * as fs from 'fs'
import * as yargs from 'yargs'
import * as out from './output'
import * as MarkdownIt from 'markdown-it'
import * as cheerio from 'cheerio'
import * as path from 'path'
import * as fse from 'fs-extra'
import * as generator from './generator'

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
        alias: "temp",
        type: "string"
    })  
    .argv;

const sourceDir = args.input ? args.input : "./";
if(!fs.existsSync(sourceDir)){
    out.msg("The specified source directory '" + sourceDir + "' does not exist.");
    process.exit(1);
}

const destinationDir = args.output ? args.output : "./";
if(!fs.existsSync(destinationDir)){
    out.msg("The specified destination directory '" + destinationDir + "' does not exist.");
    process.exit(1);
}

const templateDir = args.template ? args.template : "./";
if(!fs.existsSync(templateDir)){
    out.msg("The specified template directory '" + templateDir + "' does not exist.");
    process.exit(1);
}

if(!fs.existsSync(path.join(templateDir, "chapter.html"))){
    out.msg("The specified template directory '" + templateDir + "' does not contain a 'chapter.html' template.");
    process.exit(1);
}
if(!fs.existsSync(path.join(templateDir, "cover.html"))){
    out.msg("The specified template directory '" + templateDir + "' does not contain a 'cover.html' template.");
    process.exit(1);
}

let chapterTemplate = fs.readFileSync(path.join(templateDir, "chapter.html"));
let coverTemplate = fs.readFileSync(path.join(templateDir, "cover.html"));


const CONTENT_TARGET_ID = "content";
const TABLE_TARGET_ID = "table";

//read in an ordered list of .md files in sourceDir
const unfilteredSourceFilenames = fs.readdirSync(sourceDir);

if(unfilteredSourceFilenames.length == 0){
    out.err("Source directory " + sourceDir + " is empty.");
    process.exit(1);
}

const validSourceFilenames = generator.filterSourceFiles(sourceDir, unfilteredSourceFilenames);
let renderedChapters = generator.generateChapters(validSourceFilenames);

let chapterDOM = cheerio.load(chapterTemplate, { decodeEntities: true });
let coverDOM = cheerio.load(coverTemplate, { decodeEntities: true });

let chapterContentDiv = chapterDOM("#" + CONTENT_TARGET_ID);
let coverContentDiv = coverDOM("#" + CONTENT_TARGET_ID);

let chapterTableDiv = chapterDOM("#" + TABLE_TARGET_ID);
let coverTableDiv = coverDOM("#" + TABLE_TARGET_ID);

// Set innerHtml by =>  [component].html([html_string]);

if(!fs.existsSync(destinationDir)){
    fs.mkdirSync(destinationDir);
}

for(let chapterIndex = 0; chapterIndex < renderedChapters.length; ++chapterIndex){
    let chapter = renderedChapters[chapterIndex];
    chapterContentDiv.html(chapter.content);
    chapterTableDiv.html(chapter.table);
    let htmlRendered = chapterDOM.html({ decodeEntities: true });
    fs.writeFileSync(path.join(destinationDir, "ch" + chapterIndex + ".html"), htmlRendered);
}