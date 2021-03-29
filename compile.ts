
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
        alias: "t",
        type: "string"
    })  
    .argv;

const sourceDir = args.input ? args.input : "./";
if(!fs.existsSync(sourceDir)){
    out.msg("The specified source directory '" + sourceDir + "' does not exist.");
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

let chapterTemplate = fs.readFileSync(path.join(templateDir, "chapter.html"), "utf-8");
let coverTemplate = fs.readFileSync(path.join(templateDir, "cover.html"), "utf-8");

const CONTENT_TARGET_ID = "content";
const TABLE_TARGET_ID = "table";
const TITLE_TARGET_ID = "title";

//read in an ordered list of .md files in sourceDir
const unfilteredSourceFilenames = fs.readdirSync(sourceDir);

if(unfilteredSourceFilenames.length == 0){
    out.err("Source directory " + sourceDir + " is empty.");
    process.exit(1);
}

const rawBook = generator.filterSourceFiles(sourceDir, unfilteredSourceFilenames);
let renderedBook = generator.generateBook(rawBook);

let chapterDOM = cheerio.load(chapterTemplate, { decodeEntities: true });
let coverDOM = cheerio.load(coverTemplate, { decodeEntities: true });

let chapterContentDiv = chapterDOM("#" + CONTENT_TARGET_ID);
let coverContentDiv = coverDOM("#" + CONTENT_TARGET_ID);

let coverTitle = coverDOM("#" + TITLE_TARGET_ID);

let chapterTableDiv = chapterDOM("#" + TABLE_TARGET_ID);
let coverTableDiv = coverDOM("#" + TABLE_TARGET_ID);

const destinationDir = args.output ? args.output : "./";
if(!fs.existsSync(destinationDir)){
    fs.mkdirSync(destinationDir);
}else{
    fse.emptyDirSync(destinationDir);
}

let templateFiles = fs.readdirSync(templateDir);
const REQUIRED_TEMPLATE_FILES = ["chapter.html", "cover.html"]

for(let templateFile of templateFiles){
    let filePath = path.resolve(templateDir, templateFile);
    let ignorable = REQUIRED_TEMPLATE_FILES.includes(templateFile);
    if(!ignorable){
        fse.copy(filePath, path.resolve(destinationDir, templateFile))
    }
}

coverContentDiv.html(renderedBook.intro_content);
coverTitle.text(renderedBook.title);
let headings = ""

for(let chapterIndex = 0; chapterIndex < renderedBook.chapters.length; ++chapterIndex){
    let chapter = renderedBook.chapters[chapterIndex];
    chapterContentDiv.html(chapter.content);
    chapterTableDiv.html(chapter.table);
    let htmlRendered = chapterDOM.html({ decodeEntities: true });
    let docName = "ch" + chapterIndex + ".html";
    headings += '<li><a href="' + docName + '">' + chapter.title + "</a></li>\n";
    fs.writeFileSync(path.join(destinationDir, "ch" + chapterIndex + ".html"), htmlRendered);
}

coverTableDiv.html(headings)
let coverHtmlRendered = coverDOM.html({ decodeEntities: true });
fs.writeFileSync(path.join(destinationDir, "index.html"), coverHtmlRendered);
