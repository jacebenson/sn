---
title: "SPSEOHeaderTagsArticleViewSNC"
id: "spseoheadertagsarticleviewsnc"
---

API Name: sn_km_portal.SPSEOHeaderTagsArticleViewSNC

```js
var SPSEOHeaderTagsArticleViewSNC = Class.create();
SPSEOHeaderTagsArticleViewSNC.prototype = Object.extendsObject(global.SPSEOHeaderTags, {

    type: 'SPSEOHeaderTagsArticleViewSNC',
	knowledgeRecord: null,
	
	/* 
	 * Initializing knowledge record based on URL parameters
	 */
	initializeKnowledgeRecord: function(){
		var URLParameters = {};

		var queryParams = this.urlObj.queryParams;
		var params = queryParams.substr(queryParams.indexOf("?") + 1);
		var paramList = params.split("&");

		for(var i in paramList){
			var paramKeyVal = paramList[i].split("=");
			URLParameters[paramKeyVal[0]]=paramKeyVal[1];
		}

		var sys_kb_id = URLParameters.sys_kb_id || URLParameters.sys_id;
		var kbViewModel = new global.KBViewModel();
		if(!gs.nil(URLParameters.sysparm_article)){
			if(kbViewModel.isVersioningEnabled()){
				if (gs.nil(URLParameters.sysparm_version))
					kbViewModel.findLatestVersion(URLParameters.sysparm_article);
				else
					kbViewModel.findKnowledgeByVersion(URLParameters.sysparm_article,URLParameters.sysparm_version);
			}
			else{
				kbViewModel.findKnowledgeByNumber(URLParameters.sysparm_article + "");
			}
		}
		else if(!gs.nil(sys_kb_id))
			kbViewModel.findKnowledgeById(sys_kb_id);

		// Check public access for article
		if(kbViewModel.knowledgeRecord && kbViewModel.knowledgeRecord.canRead())
			this.knowledgeRecord = kbViewModel.knowledgeRecord;
	},
	
	/* 
	 * Generate hreflang array for the current language and the available translations
	 * @return array of objects containing locale and href
	 * [{locale:'fr-ca', href: 'https://instance.com/csp/fr?id=kb_article_view&sysparm_article=KB0000001'}]
	 */
    generateHrefLangArray: function() {
		var items = [];
		if(GlidePluginManager().isActive('com.glideapp.knowledge.i18n2') && !gs.nil(this.knowledgeRecord)){
			var kbViewModel = new global.KBViewModel();
			var langList=kbViewModel.getLanguagesToDisplay(this.knowledgeRecord);
			var langObj = {};
			for(var i in langList){
				var lang = langList[i].language;
				var locale = this.localeMap[lang] || lang;
				if (locale) {
					langObj = {};
					langObj.locale = locale;
					
					//adding href lang url same for the current article and for other languages adding the sysparm_article in the URL 
					langObj.href = langList[i].selected ? this.urlObj.siteURL + "/" + lang + this.urlObj.queryParams : this.urlObj.siteURL + "/" + lang + "?id=kb_article_view&sysparm_article=" + langList[i].number; 
					items.push(langObj);
				}
			}
		}
        return items;
    },
	
	/* 
	 * Generate Canonical URL with article number
	 * Should return fully qualified URL as string like 'https://instance.com/csp/?id=kb_article_view&sysparm_article=KB0000001'
	 * @return string : Canonical URL
	 */
    generateCanonicalURL: function() {
		var canonicalURL = "";
		
		if(!gs.nil(this.knowledgeRecord)){
			canonicalURL = (this.urlObj.siteURL + "?id=kb_article_view&sysparm_article=" + this.knowledgeRecord.number); 
		}
        return canonicalURL;
    },
	
	
	/* 
	 * Base function
	 * returns array of objects in below format
	 * {
	 *   canonicalURL : 'https://instance.com/csp/?id=kb_article_view&sysparm_article=KB0000001',
	 *   hrefLangs : [{locale:'fr-ca', href: 'https://instance.com/csp/fr?id=kb_article_view&sysparm_article=KB0000001'}],
	 *   customSEOTags : ['<meta custom-tag=""  property="og:title" content="Service Portal">']
	 * }
	 */
    generateSEOTags: function(pageGR) {
		
		//initializing urlObj and Knowledge record
        this.urlObj = global.SPSEOHeaderTagsSNC.getURLObj();
		this.initializeKnowledgeRecord();
		
        var items = {};
        items.canonicalURL = this.generateCanonicalURL();
        items.hrefLangs = this.generateHrefLangArray();
		items.customSEOTags = this.generateCustomTagsForSEO();
        return items;
    },
});
```