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
exports.generateBook = exports.generateChapters = exports.filterSourceFiles = void 0;
var cheerio = __importStar(require("cheerio"));
var out = __importStar(require("./output"));
var fs = __importStar(require("fs"));
var path = __importStar(require("path"));
var MarkdownIt = require("markdown-it");
var md = new MarkdownIt().use(require('markdown-it-mathjax')());
;
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
