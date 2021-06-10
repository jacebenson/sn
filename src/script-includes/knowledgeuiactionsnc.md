---
title: "KnowledgeUIActionSNC"
id: "knowledgeuiactionsnc"
---

API Name: global.KnowledgeUIActionSNC

```js
var KnowledgeUIActionSNC = Class.create();
KnowledgeUIActionSNC.prototype = {
    initialize: function() {
    },
	viewArticle: function(current, ui_type){
		if(current.changes())
			current.update();
		switch (ui_type){
			case 'workspace':
				//action.setRedirectURL("kb_knowledge.do?sys_id="+current.sys_id);
				break;
			case 'platform':
				gs.setRedirect("kb_view.do?sys_kb_id=" + current.sys_id);
				break;
			default:
				break;
		}		
	},
	
	getEditableFields: function() {
		return new KBVersioning().getEditableFields();
	},
	
	articleExistsForSource: function(sourceId) {
		var gr = new GlideRecord("kb_knowledge");
		if(sourceId) {
			gr.addQuery("source",sourceId);
			gr.query();
			if(gr.next())
				return true;
		}
		return false;
	},

	tableMapExists: function(source,mapName) {
		if(source) {
			var mapUtil = new CSMTableMapUtil(source);
			if(mapName && mapName != '')
				return (mapUtil.findMapByName(mapName) && new KBKnowledge().canCreate());
		}
		return false;
	},

	showTemplateSelector: function() {
            	if(new KBViewModel().isVersioningInstalled()) 
                   	if(new ArticleTemplateUtil().canContributeToTemplates())
                            	return true;
            	return false;
       	},
	
    type: 'KnowledgeUIActionSNC'
};
```