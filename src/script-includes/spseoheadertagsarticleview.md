---
title: "SPSEOHeaderTagsArticleView"
id: "spseoheadertagsarticleview"
---

API Name: sn_km_portal.SPSEOHeaderTagsArticleView

```js
var SPSEOHeaderTagsArticleView = Class.create();
SPSEOHeaderTagsArticleView.prototype = Object.extendsObject(sn_km_portal.SPSEOHeaderTagsArticleViewSNC, {

    type: 'SPSEOHeaderTagsArticleView'
	
	/*
	
	generateSEOTags - The base function that calls all other functions. Returns array of objects in below format
	{
	   canonicalURL : 'https://instance.com/csp/?id=kb_article_view&sysparm_article=KB0000001',
	   hrefLangs : [{locale:'fr-ca', href: 'https://instance.com/csp/fr?id=kb_article_view&sysparm_article=KB0000001'}],
	   customSEOTags : ['<meta custom-tag=""  property="og:title" content="Service Portal">']
	}

	generateCanonicalURL - returns fully qualified URL as string
	'https://instance.com/csp/?id=kb_article_view&sysparm_article=KB0000001'

	generateHrefLangArray - returns array of objects containing locale and href 
	[{locale:'fr-ca', href: 'https://instance.com/csp/fr?id=kb_article_view&sysparm_article=KB0000001'}]

	generateCustomTagsForSEO - returns custom tags as array of strings that will be updated in the page dom as-is
	['<meta custom-tag=""  property="og:title" content="Service Portal">']
	
	*/
});
```