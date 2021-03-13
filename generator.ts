import * as MarkdownIt from 'markdown-it'
import * as cheerio from 'cheerio'
import * as out from './output'
import * as fs from 'fs'
import * as path from 'path'

const md = new MarkdownIt();

const ENCODING = "utf-8";
const VALID_CH_FILENAME = /^ch(?<index>[0-9]+)_[a-zA-Z0-9_-\s]+\.md$/;

type RenderedChapter = {
    title: string,
    content: string,
    table: string,
}

export const filterSourceFiles = (sourceDir: string, unfiltered: Array<string>): Array<string> => {
    let validFilenames = []
    for (let filename of unfiltered) {
        let match:RegExpExecArray = VALID_CH_FILENAME.exec(filename);
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
        }else{
            validFilenames[index] = path.join(sourceDir, validFilenames[index][0]);
        }
    }
    return validFilenames;
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
            out.warn('Chapter ' + index + ' (' + filename[0] + ") does not have a heading.");
        }else{
            if(firstHeadings.length > 1){
                out.warn('Chapter ' + index + ' (' + filename[0] + ") has more than one <h1>.");
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