let site = require("../_data/site.js");
module.exports = function() {
    var returnObj = {
        //"layout": `/theme/${site.theme}/layouts/post-single.njk`,
        "layout": `/layouts/post-single-earl.njk`,
        "tags": "getting-started",
        "imageName": "featured-640.webp",
        "imageWidth": "640",
        "imageThumbnail": "featured-100.webp",
        "featured": "false",
        "meta": [],
        "summary": "I am a summary, Set me on the post"
    }
    return returnObj;
}