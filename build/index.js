#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
var generator = __importStar(require("./generator"));
var fs = __importStar(require("fs"));
var yargs = __importStar(require("yargs"));
var out = __importStar(require("./output"));
var cheerio = __importStar(require("cheerio"));
var path = __importStar(require("path"));
var fse = __importStar(require("fs-extra"));
var args = yargs
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
var sourceDir = args.input ? args.input : "./src";
if (!fs.existsSync(sourceDir)) {
    out.msg("The specified source directory '" + sourceDir + "' does not exist.");
    process.exit(1);
}
var templateDir = args.template ? args.template : "./public";
if (!fs.existsSync(templateDir)) {
    out.msg("The specified template directory '" + templateDir + "' does not exist.");
    process.exit(1);
}
if (!fs.existsSync(path.join(templateDir, "chapter.html"))) {
    out.msg("The specified template directory '" + templateDir + "' does not contain a 'chapter.html' template.");
    process.exit(1);
}
if (!fs.existsSync(path.join(templateDir, "cover.html"))) {
    out.msg("The specified template directory '" + templateDir + "' does not contain a 'cover.html' template.");
    process.exit(1);
}
var chapterTemplate = fs.readFileSync(path.join(templateDir, "chapter.html"), "utf-8");
var coverTemplate = fs.readFileSync(path.join(templateDir, "cover.html"), "utf-8");
var CONTENT_TARGET_ID = "content";
var TABLE_TARGET_ID = "table";
var TITLE_TARGET_ID = "title";
//read in an ordered list of .md files in sourceDir
var unfilteredSourceFilenames = fs.readdirSync(sourceDir);
if (unfilteredSourceFilenames.length == 0) {
    out.err("Source directory " + sourceDir + " is empty.");
    process.exit(1);
}
var rawBook = generator.filterSourceFiles(sourceDir, unfilteredSourceFilenames);
var renderedBook = generator.generateBook(rawBook);
var chapterDOM = cheerio.load(chapterTemplate, { decodeEntities: true });
var coverDOM = cheerio.load(coverTemplate, { decodeEntities: true });
var chapterContentDiv = chapterDOM("#" + CONTENT_TARGET_ID);
var coverContentDiv = coverDOM("#" + CONTENT_TARGET_ID);
var coverTitle = coverDOM("#" + TITLE_TARGET_ID);
var chapterTableDiv = chapterDOM("#" + TABLE_TARGET_ID);
var coverTableDiv = coverDOM("#" + TABLE_TARGET_ID);
var destinationDir = args.output ? args.output : "./";
if (!fs.existsSync(destinationDir)) {
    fs.mkdirSync(destinationDir);
}
else {
    fse.emptyDirSync(destinationDir);
}
var templateFiles = fs.readdirSync(templateDir);
var REQUIRED_TEMPLATE_FILES = ["chapter.html", "cover.html"];
for (var _i = 0, templateFiles_1 = templateFiles; _i < templateFiles_1.length; _i++) {
    var templateFile = templateFiles_1[_i];
    var filePath = path.resolve(templateDir, templateFile);
    var ignorable = REQUIRED_TEMPLATE_FILES.includes(templateFile);
    if (!ignorable) {
        fse.copy(filePath, path.resolve(destinationDir, templateFile));
    }
}
coverContentDiv.html(renderedBook.intro_content);
coverTitle.text(renderedBook.title);
var headings = "";
for (var chapterIndex = 0; chapterIndex < renderedBook.chapters.length; ++chapterIndex) {
    var chapter = renderedBook.chapters[chapterIndex];
    chapterContentDiv.html(chapter.content);
    chapterTableDiv.html(chapter.table);
    var htmlRendered = chapterDOM.html({ decodeEntities: true });
    var docName = "ch" + chapterIndex + ".html";
    headings += '<li><a href="' + docName + '">' + chapter.title + "</a></li>\n";
    fs.writeFileSync(path.join(destinationDir, "ch" + chapterIndex + ".html"), htmlRendered);
}
coverTableDiv.html(headings);
var coverHtmlRendered = coverDOM.html({ decodeEntities: true });
fs.writeFileSync(path.join(destinationDir, "index.html"), coverHtmlRendered);
