import * as MarkdownIt from 'markdown-it'
import * as cheerio from 'cheerio'
import * as out from './output'
import * as fs from 'fs'
import * as path from 'path'

const md = new MarkdownIt();

const ENCODING = "utf-8";

type RenderedChapter = {
    title: string,
    content: string,
    table: string,
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