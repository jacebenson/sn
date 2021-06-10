---
title: "MobileKnowledgeUtil"
id: "mobileknowledgeutil"
---

API Name: sn_km_mr.MobileKnowledgeUtil

```js
var MobileKnowledgeUtil = Class.create();
MobileKnowledgeUtil.prototype = Object.extendsObject(global.AbstractAjaxProcessor, {

	getServicePortalKnowledgeBases: function(portal){
		var KBList = [];
		var portalKbGr = new GlideRecord("m2m_sp_portal_knowledge_base");
		portalKbGr.addActiveQuery();
		portalKbGr.addQuery("sp_portal.url_suffix",portal);
		portalKbGr.orderBy("order");
		portalKbGr.orderBy("kb_knowledge_base.title");
		portalKbGr.query();
		while(portalKbGr.next()){
			KBList.push(portalKbGr.getValue('kb_knowledge_base')+"");
		}

		if(!KBList.length){
			var KBaseGr = new GlideRecord("kb_knowledge_base");
			KBaseGr.addActiveQuery();
			KBaseGr.orderBy("order");
			KBaseGr.query();
			while(KBaseGr.next()){
				if(KBaseGr.canRead())
					KBList.push(KBaseGr.getUniqueValue()+"");
			}
		}
		return KBList;
	},

	type: 'MobileKnowledgeUtil'
});
```