const dotenv = require('dotenv').config()
let now = new Date();
const fs = require("fs"); // Or `import fs from "fs";` with ESM
const path = require("path");
//let theme = "jace-ty"
let theme = "jace-docs"
module.exports = {
    getFile: function(pathLoc){
        //This gets the path of the file asked.  If you ask for header.njk
        //it looks for ./src/_includes/layouts/header.njk //if found returns this
        //if not found, looks for ./src/_includes/theme/*themename*/header.njk// if found returns this
        //if neither found, console logs file not found
        //assume they mean locally the _includes folder
        let layoutsFolder = "./src/_includes/"
        let themeFolder = "./src/_includes/theme/" + theme + "/"
        let localFilePath = path.resolve(path.join(layoutsFolder, pathLoc))
        let themeFilePath = path.resolve(path.join(themeFolder, pathLoc))
        if(fs.existsSync(localFilePath)){
            return localFilePath.toString();
        } else if (fs.existsSync(themeFilePath)) {
            return themeFilePath.toString();
        } else {
            console.log(`file not found ${pathLoc} in ${localFilePath} or ${themeFilePath}`)
        }
    },
    theme: theme,//expose to other files
    environment: process.env.ELEVENTY_ENV,
    menu: [
        {
            link: "https://github.com/jacebenson/jace-ty/",
            text: "GitHub",
        },
        {
            link: "/script-includes/abstractajaxprocessor/",
            text: "Script Includes",
        },
        {
            link: "/properties/app.service.persist.list.state/",
            text: "Properties",
        },
        {
            link: "/classes/glideaggregate/",
            text: "Classes",
        },
    ],
    twitter: "jacebenson",
    github: "https://github.com/jacebenson/sn",
    linkedin: "https://linkedin.com/in/jacebenson",
    baseURL: "https://sn.jace.pro",
    title: "Unofficial SN Docs",
    patreon: {
        footerMessage: "Become a Patron and you'll get access to my posts in progress, polls, thoughts and other things I want to share.  A monthly happy hour with me and access to my PDI.",
        link: "https://www.patreon.com/bePatron?u=23597006",
        text: "Become a Patron!",
        active: false
    },
    description: "A place to have when the docs go down!",
    subtitle: "My own copy of the docs in the event they go down or I need to make notes!",
    author: "Jace Benson",//used all over
    email: "jace.benson@gmail.com",//used specificly for rss feed
    //utterancesRepo: "jacebenson/jace-ty",//used for comments//if commented, doesnt load
    lastBuildDate: now.toLocaleString('en-CA',{hour12:false, timeZone: 'America/Chicago'}).replace(',',''),
    lastBuildYear: now.getFullYear(),
}