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
define("output", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.warn = exports.err = exports.msg = exports.succ = void 0;
    var successHeader = "[\x1b[32m OK \x1b[0m] -- ";
    var neutralHeader = "[\x1b[35m MSG \x1b[0m] -- ";
    var failHeader = "[\x1b[31m ERR \x1b[0m] -- ";
    var warnHeader = "[\u001b[33m WAR \x1b[0m] -- ";
    var succ = function (msg) {
        console.log(successHeader + msg);
    };
    exports.succ = succ;
    var msg = function (msg) {
        console.log(neutralHeader + msg);
    };
    exports.msg = msg;
    var err = function (msg) {
        console.log(failHeader + msg);
    };
    exports.err = err;
    var warn = function (msg) {
        console.log(warnHeader + msg);
    };
    exports.warn = warn;
});
define("generator", ["require", "exports", "cheerio", "output", "fs", "path"], function (require, exports, cheerio, out, fs, path) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.generateBook = exports.generateChapters = exports.filterSourceFiles = void 0;
    cheerio = __importStar(cheerio);
    out = __importStar(out);
    fs = __importStar(fs);
    path = __importStar(path);
    var MarkdownIt = require("markdown-it");
    var md = new MarkdownIt();
    var ENCODING = "utf-8";
    var VALID_CH_FILENAME = /^ch(?<index>[0-9]+)_[a-zA-Z0-9_-\s]+\.md$/;
    var filterSourceFiles = function (sourceDir, unfiltered) {
        var chapters = [];
        var cover = null;
        for (var _i = 0, unfiltered_1 = unfiltered; _i < unfiltered_1.length; _i++) {
            var filename = unfiltered_1[_i];
            var match = VALID_CH_FILENAME.exec(filename);
            if (match == null) {
                if (filename !== "cover.md") {
                    out.warn("'" + filename + "' is not a valid section filename and will be ignored.");
                }
                else {
                    cover = path.resolve(sourceDir, "cover.md");
                }
            }
            else {
                var startIndex = 0;
                var endIndex = chapters.length;
                var testIndex = Math.floor(startIndex + (endIndex - startIndex) / 2);
                var testElement = chapters[testIndex];
                while (startIndex != endIndex) {
                    if (parseInt(testElement.groups.index) > parseInt(match.groups.index)) {
                        endIndex = parseInt(testElement.groups.index);
                    }
                    else if (parseInt(testElement.groups.index) < parseInt(match.groups.index)) {
                        startIndex = parseInt(testElement.groups.index);
                    }
                    else {
                        out.err("'" + filename + "' and '" + testElement[0] + "' share the same index.");
                        process.exit(1);
                    }
                    testIndex = Math.floor(startIndex + (endIndex - startIndex) / 2);
                    testElement = chapters[testIndex];
                }
                chapters.splice(startIndex, 0, match);
            }
        }
        if (cover === null)
            out.err("Source directory " + sourceDir + " does not contain a cover file (cover.md).");
        // exit if the list has missing ordinal items, starting with s1
        for (var index = 0; index < chapters.length; ++index) {
            var expectedSectionIndex = index + 1;
            var currentSectionIndex = parseInt(chapters[index].groups.index);
            if (expectedSectionIndex != currentSectionIndex) {
                var difference = currentSectionIndex - expectedSectionIndex;
                if (difference > 1) {
                    out.err("Sections " + (expectedSectionIndex) + "-" + (currentSectionIndex - 1) + " are missing.");
                }
                else {
                    out.err("Section " + (expectedSectionIndex) + " is missing.");
                }
                process.exit(1);
            }
            else {
                chapters[index] = path.join(sourceDir, chapters[index][0]);
            }
        }
        return {
            cover: cover,
            chapters: chapters
        };
    };
    exports.filterSourceFiles = filterSourceFiles;
    var generateChapters = function (filenames) {
        var chapters = [];
        for (var index = 0; index < filenames.length; ++index) {
            var filename = filenames[index];
            var fileContents = fs.readFileSync(filename, ENCODING);
            var htmlRendered = md.render(fileContents);
            var $ = cheerio.load(htmlRendered, {
                decodeEntities: true
            });
            var firstHeadings = $('h1');
            var title = "";
            if (firstHeadings.length == 0) {
                out.warn('Chapter ' + (index + 1) + ' (' + filename + ") does not have a heading.");
            }
            else {
                if (firstHeadings.length > 1) {
                    out.warn('Chapter ' + (index + 1) + ' (' + filename + ") has more than one <h1>.");
                }
                title = firstHeadings[0].children[0].data;
            }
            var secondHeadings = $('h2');
            var chapterTableOfContents = "";
            for (var _i = 0, _a = secondHeadings.toArray(); _i < _a.length; _i++) {
                var secondHeading = _a[_i];
                chapterTableOfContents += "<li>" + secondHeading.children[0].data + "</li>";
            }
            chapters.push({
                title: title,
                content: $.html({ decodeEntities: true }),
                table: chapterTableOfContents
            });
        }
        return chapters;
    };
    exports.generateChapters = generateChapters;
    var generateBook = function (raw) {
        var coverContent = fs.readFileSync(raw.cover, "utf-8");
        var coverHTMLString = md.render(coverContent);
        var coverDOM = cheerio.load(coverHTMLString);
        var title = "";
        var firstHeadings = coverDOM("h1");
        if (firstHeadings.length == 0) {
            out.warn('The cover of the book does not include a title.');
        }
        else {
            if (firstHeadings.length > 1) {
                out.warn('The cover of the book uses more than one title-level heading.');
            }
            title = firstHeadings[0].children[0].data;
        }
        firstHeadings.remove();
        return {
            title: title,
            intro_content: coverDOM.html({ decodeEntities: true }),
            chapters: exports.generateChapters(raw.chapters)
        };
    };
    exports.generateBook = generateBook;
});
define("index", ["require", "exports", "fs", "yargs", "output", "cheerio", "path", "fs-extra", "generator"], function (require, exports, fs, yargs, out, cheerio, path, fse, generator) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    fs = __importStar(fs);
    yargs = __importStar(yargs);
    out = __importStar(out);
    cheerio = __importStar(cheerio);
    path = __importStar(path);
    fse = __importStar(fse);
    generator = __importStar(generator);
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
    var sourceDir = args.input ? args.input : "./";
    if (!fs.existsSync(sourceDir)) {
        out.msg("The specified source directory '" + sourceDir + "' does not exist.");
        process.exit(1);
    }
    var templateDir = args.template ? args.template : "./";
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
});
