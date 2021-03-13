
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
    .option("chapter-template", {
        alias: "ch",
        type: "string"
    })    
    .option("cover-template", {
        alias: "cv",
        type: "string"
    })    
    .argv;

const sourceDir = args.input ? args.input : "./";

const defaultTemplate = !args['chapter-template'] || !args['cover-template'] ? fs.readFileSync("./template.html") : null;
let chapterTemplate = args['chapter-template'] ? fs.readFileSync(args['chapter-template']) : defaultTemplate;
let coverTemplate = args['cover-template'] ? fs.readFileSync(args['cover-template']) : defaultTemplate;

const destinationDir = args.output ? args.output : "./";

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

renderedChapters.forEach(() => {
    
})

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