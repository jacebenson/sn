---
title: "KnowledgeRefQualifiersSNC"
id: "knowledgerefqualifierssnc"
---

API Name: global.KnowledgeRefQualifiersSNC

```js
var KnowledgeRefQualifiersSNC = Class.create();
KnowledgeRefQualifiersSNC.prototype = {
    initialize: function() {
    },
	
	getCanContributeKBs: function(tableName) {
		if(gs.tableExists('kb_article_template')){
			var gr = new GlideRecord('kb_article_template');
			gr.addQuery('child_table', tableName);
			gr.query();
			if(gr.hasNext()){
				var prefix = "sys_idIN";
				gs.addInfoMessage(gs.getMessage('The list of knowledge bases is filtered based on the selected article template.'));
				return prefix + Object.keys(new ArticleTemplateUtil().getCanContributeKBForTemplate(tableName)).join(',');
			}
		}
		
		if(tableName == "kb_knowledge" || tableName == "kb_knowledge_block"){
			if(gs.hasRole('admin'))
				return '';
		
			var kbs = JSON.parse(new SNC.KnowledgeHelper().getMyWritableKnowledgeBases());
			kbs = kbs.map(function(kb){
				return kb.sys_id;
			});
			if(tableName==="kb_knowledge_block")
				return 'enable_blocks=true^sys_idIN'+kbs.join(',');
			return 'sys_idIN'+kbs.join(',');
		}
		return '';
	},

	getCanReadKBs: function() {
		var ids = "";
		var kbHelper = new SNC.KnowledgeHelper();
		
		if(gs.hasRole("admin"))
			return ids;
		
		ids = "sys_idIN";
		var kb = new GlideRecord("kb_knowledge_base");
		kb.addActiveQuery();
		kb.query();
		
		while(kb.next()) {
			if(kbHelper.canRead(kb))	
				ids += kb.getUniqueValue() + ",";
		}
		
		return ids;
	},
	
	
	/**
	 * Generates a list of selectable knowledge base records based on a users roles for the
	 * kb_uc many to many tables
	 * 
	 * @return String enodedQuery
	 */
	kbReferenceQualifierForUcTables: function() {
		var kbAccess = new KnowledgeAccess();
		var kbs = [];
		var kbGR = new GlideRecord('kb_knowledge_base');
		kbGR.addActiveQuery();
		kbGR.addQuery('kb_version', '!=', '2');
		kbGR.query();
		while(kbGR.next()) {
			if(kbAccess.managerRights(kbGR)) 
				kbs.push(kbGR.sys_id + '');
		}
		return 'sys_idIN'+kbs.join(',');
	},
	
	/**
	 * Returns a list of workflows that run on the kb_knowledge table
	 *
	 * @return String enodedQuery
	 */
	knowledgeWorkflows: function() {
		var wfIds = [];
		var gr = new GlideRecord("wf_workflow_version");
		gr.addQuery("published", true);
		gr.addQuery("table", "kb_knowledge");
		gr.addActiveQuery();
		gr.query();
		
		while(gr.next()) {
			wfIds.push(gr.workflow.toString());
		}
		
		return "sys_idIN" + wfIds.join();
	},
		
	/** Qualifier to return list of category ids belongs to a specified knowledge base
	 *
	 *
	 * @return string qualifier using list of category id
	**/
	getRefQualCategoryIdsForKB: function(kbKnowledgeBaseId) {
		return new global.GlobalKnowledgeUtil().getRefQualCategoryIdsForKB(kbKnowledgeBaseId);
	},

	getWritableArticles: function() {
		var kbHelper = new SNC.KnowledgeHelper();
		return kbHelper.filterContributableArticles();
	},
	
	type: 'KnowledgeRefQualifiersSNC'
};
```