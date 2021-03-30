import * as cheerio from 'cheerio'
import * as out from './output'
import * as fs from 'fs'
import * as path from 'path'

const MarkdownIt = require("markdown-it");
const md = new MarkdownIt().use(require('markdown-it-mathjax')());;

const ENCODING = "utf-8";
const VALID_CH_FILENAME = /^ch(?<index>[0-9]+)_[a-zA-Z0-9_-\s]+\.md$/;

type RenderedChapter = {
    title: string,
    content: string,
    table: string,
}

type RenderedBook = {
    title: string,
    intro_content: string,
    chapters: Array<RenderedChapter>
}

type RawBook = {
    cover: string,
    chapters: Array<string>
}

export const filterSourceFiles = (sourceDir: string, unfiltered: Array<string>): RawBook => {
    let chapters = []
    let cover = null;

    for (let filename of unfiltered) {
        let match:RegExpExecArray = VALID_CH_FILENAME.exec(filename);
        if(match == null) {
            if(filename !== "cover.md"){
                out.warn("'" + filename + "' is not a valid section filename and will be ignored.");
            }else{
                cover = path.resolve(sourceDir, "cover.md");
            }
        }else{
            let startIndex = 0;
            let endIndex = chapters.length;
            let testIndex = Math.floor(startIndex + (endIndex - startIndex) / 2);
            let testElement:RegExpExecArray = chapters[testIndex]
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
                testElement = chapters[testIndex]
            }
            chapters.splice(startIndex, 0, match);
        }
    }
    
    if(cover === null) out.err("Source directory " + sourceDir + " does not contain a cover file (cover.md).");

    // exit if the list has missing ordinal items, starting with s1
    for(let index = 0; index<chapters.length; ++index){
        let expectedSectionIndex = index + 1;
        let currentSectionIndex = parseInt(chapters[index].groups.index);
        if(expectedSectionIndex != currentSectionIndex){
            let difference = currentSectionIndex - expectedSectionIndex;
            if(difference > 1){
                out.err("Sections " + (expectedSectionIndex) + "-" + (currentSectionIndex - 1) + " are missing.");
            }else{
                out.err("Section " + (expectedSectionIndex) + " is missing.");
            }
            process.exit(1);
        }else{
            chapters[index] = path.join(sourceDir, chapters[index][0]);
        }
    }
    return {
        cover: cover,
        chapters: chapters
    };
}

export const generateChapters = (filenames: Array<string>): Array<RenderedChapter> => {
    let chapters = [];
    for(let index = 0; index < filenames.length; ++index){
        let filename = filenames[index];
        const fileContents = fs.readFileSync(filename, ENCODING);
        let htmlRendered = md.render(fileContents);
        
        let $ = cheerio.load(htmlRendered, {
            decodeEntities: true
        });
    
        let firstHeadings = $('h1');
        let title = "";

        if(firstHeadings.length == 0){
            out.warn('Chapter ' + (index + 1) + ' (' + filename + ") does not have a heading.");
        }else{
            if(firstHeadings.length > 1){
                out.warn('Chapter ' + (index + 1) + ' (' + filename + ") has more than one <h1>.");
            }
            title = (firstHeadings[0] as any).children[0].data;
        }
    
        let secondHeadings = $('h2');
        let chapterTableOfContents = ""
        for(let secondHeading of secondHeadings.toArray()){
            chapterTableOfContents += "<li>" + (secondHeading as any).children[0].data + "</li>"
        }
        chapters.push({
            title: title,
            content: $.html({decodeEntities: true}),
            table: chapterTableOfContents
        });
    }

    return chapters;
}

export const generateBook = (raw:RawBook):RenderedBook => {
    let coverContent = fs.readFileSync(raw.cover, "utf-8");
    let coverHTMLString = md.render(coverContent);
    let coverDOM = cheerio.load(coverHTMLString);

    let title = "";
    let firstHeadings = coverDOM("h1");
    if(firstHeadings.length == 0){
        out.warn('The cover of the book does not include a title.');
    }else{
        if(firstHeadings.length > 1){
            out.warn('The cover of the book uses more than one title-level heading.');
        }
        title = (firstHeadings[0] as any).children[0].data;        
    }

    firstHeadings.remove();

    return {
        title: title,
        intro_content: coverDOM.html({ decodeEntities: true }),
        chapters: generateChapters(raw.chapters)
    }
}