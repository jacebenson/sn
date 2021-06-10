---
title: "cxs_Knowledge"
id: "cxs_knowledge"
---

API Name: global.cxs_Knowledge

```js
var cxs_Knowledge = Class.create();

cxs_Knowledge.prototype = Object.extendsObject(AbstractAjaxProcessor, {
	EMBED_KB_LINK:'embed_link',
	EMBED_KB_ARTICLE:'embed_article',
	getArticleInfo: function() {//for processing GlideAjax call
		var kbSysId = this.getParameter("sysparm_kb_sys_id");
		var kbInsertAsLink= this.getParameter('sysparam_kb_insert_as_link');
		var cxsUiActionConfig = this.getParameter('sysparm_cxs_ui_action_config_sysid');
		return new JSON().encode(this.getArticleInfoInternal(kbSysId, kbInsertAsLink, cxsUiActionConfig));
	},
	
	getArticleInfoInternal: function(kbSysId, kbInsertAsLink, cxsUiActionConfig) {
		var response = {
			article: {
				content: "",
				id: "",
				short_description: "",
				number: ""
			},
			fields: [],
			contentType: "article",
			useCustomFieldForAttach: false
		};
		
		if (kbSysId != "") {
			var article = new GlideRecord("kb_knowledge");
			if (article.get(kbSysId)) {
				
				if (!article.canRead())
					return new JSON().encode(response);
				
				response.article.id = article.getUniqueValue();
				var insertKBLink = kbInsertAsLink+"" === this.EMBED_KB_LINK;
				var s = gs.getMessage("Knowledge article {0}: \n", article.number);
					if (gs.getProperty("glide.ui.security.allow_codetag", "true") != "true")
						s += article.short_description;
					else {
						var displayValue;
						if(insertKBLink){
							s='';
							var queryParameter = 'kb_view.do?sys_kb_id=';
							var shortDesc = GlideStringUtil.escapeHTML(article.short_description).trim();
							displayValue = "<a title='" + shortDesc + "' href='";
							displayValue += queryParameter+article.getUniqueValue() + "' >";
							displayValue += article.number + " : " + shortDesc + "</a>";
						}else
						displayValue = SNC.GlideHTMLSanitizer.sanitize(new KnowledgeHelp(article).findDisplayValue());
						s += "[code]" + displayValue + "[/code]";
					}
					
					response.article.content = s;
					response.article.number = article.number;
					response.article.short_description = article.short_description;
					response.fields = gs.getProperty("glide.knowman.attach.fields", "").split(",");
				}
			}

			response = this.getAttachNoteFields(response, cxsUiActionConfig);

			return response;
		},
	
		getAttachNoteFields: function(response, cxsUiActionConfig) {
			// Check if allow custom field for attach note
			var searchActionConfig = new GlideRecord("cxs_ui_action_config");
			searchActionConfig.addQuery("sys_id", cxsUiActionConfig+"");
			searchActionConfig.query();
			if (searchActionConfig.next()) {
				if (searchActionConfig.getValue("use_custom_field_for_attach") == 1) {
					// This attribute indicates whether we override knowledge property
					response.useCustomFieldForAttach = true;
					
					// Get the name of table that we attach to
					var baseConfigurationSysID = searchActionConfig.getValue("search_ui_config");
					var cxsTableConfig = new GlideRecord("cxs_table_config");
					var table = "";
					if (cxsTableConfig.get(baseConfigurationSysID))
						table = cxsTableConfig.getValue("table");
					
					var attachNoteField = searchActionConfig.getValue("attach_note_field");
					// The field of "use_custom_field_for_attach" set to "true", and
					// check if "attach_note_field" is empty or not.
					// Custom field has higher priority than system property (response.fields), we need to override.
					
					// First remove all attach note fields specified from glide.knowledge.properties
					response.fields = [];
					// Then add new field into the list
					var newAttachField = "";
					if (attachNoteField) {
						attachNoteField = attachNoteField.trim().toLowerCase();
						newAttachField = table + "." + attachNoteField;
						response.fields.push(newAttachField);
					} else {
						newAttachField = table + ".no_attach_field";
						response.fields.push(newAttachField);
					}
				}
			}
			
			return response;
		},
		
		getSocialQAInternal: function(table, kbSysId, kbInsertAsLink) {
			var response = {
				article: {
					content: "",
					id: ""
				},
				contentType: "Social Q&A"
			};
			
			if (kbSysId != "") {
				var article = new GlideRecord(table);
				if (article.get(kbSysId)) {
					
					if (!article.canRead())
						return response;
					
					
					if(this.isQuestionCommunity(table, article)) {
						return this.getCommunityQAInternal(table, kbSysId, kbInsertAsLink);
					}
					
					response.article.id = article.getUniqueValue();
					var insertKBLink = kbInsertAsLink+"" === this.EMBED_KB_LINK;
					var s = gs.getMessage("Social QA: \n");
					if (gs.getProperty("glide.ui.security.allow_codetag", "true") != "true")
						s += article.question;
					else {
						var displayValue;
						if(insertKBLink){
							s='';
							var queryParameter = '$social_qa.do?sysparm_view=question&sysparm_question_id=';
							var question = GlideStringUtil.escapeHTML(article.question);
							displayValue = "<a title='" + question + "' href='";
							displayValue += queryParameter+article.getUniqueValue() + "' >";
							displayValue += question + "</a>";
						}else
						//This case is not required or supported.
						displayValue = article.question+"\n"+article.question_details;
						s += "[code]" + displayValue + "[/code]";
					}
					
					response.article.content = s;
				}
			}
			
			return response;
		},
		
		getCommunityBlogInternal: function(blogID, insertAsLink) {
			var response = {
				article: {
					content: "",
					id: ""
				},
				contentType: "blog"
			};
			
			if (blogID != "") {
				var article = new GlideRecord("sn_communities_blog");
				if (article.get(blogID)) {
					
					if (!article.canRead())
						return response;
					
					response.article.id = article.getUniqueValue();
					var insertKBLink = insertAsLink+"" === this.EMBED_KB_LINK;
					var s = gs.getMessage("Blog : \n");
					if (gs.getProperty("glide.ui.security.allow_codetag", "true") != "true")
						s += article.title;
					else {
						var displayValue;
						if(insertKBLink){
							s='';
							var baseURL = new sn_communities.CommunityUtilSNC().getInstanceBaseUrl();
							var fullURL = baseURL + '?id=community_blog&sys_id=' + response.article.id;
							var title = GlideStringUtil.escapeHTML(article.title);
							displayValue = "<a title='" + title + "' href='";
							displayValue += fullURL + "' >";
							displayValue += title + "</a>";
						}
						else
							return response;
						
						s += "[code]" + displayValue + "[/code]";
					}
					
					response.article.content = s;
				}
			}
			
			return response;
		},
		
		isQuestionCommunity : function(table, contentGR) {
			var kbID;
			if(table == "kb_social_qa_answer") {
				kbID = contentGR.question.kb_knowledge_base.sys_id;
			}
			else if(table === "kb_social_qa_question") {
				kbID = contentGR.kb_knowledge_base.sys_id;
			}
			
			var communityKBID = gs.getProperty("sn_communities.knowledge_base_id");
			
			if(kbID == communityKBID)
				return true;
			
			return false;
		},
		
		getCommunityQAInternal: function(table, contentID, insertAsLink) {
			var response = {
				article: {
					content: "",
					id: ""
				},
				contentType: "discussion"
			};
			
			if (contentID != "") {
				var article = new GlideRecord(table);
				if (article.get(contentID)) {
					
					if (!article.canRead())
						return response;
					
					var articleID = article.getUniqueValue();
					var title = "";
					if(table == "kb_social_qa_answer") {
						title = article.question.question + '';
						articleID = article.getValue("question");
					}
					else if(table == "kb_social_qa_question") {
						title = article.question + '';
						articleID = article.getUniqueValue();
					}
					
					response.article.id = articleID;
					var insertKBLink = insertAsLink+"" === this.EMBED_KB_LINK;
					var s = gs.getMessage("Discussion : \n");
					if (gs.getProperty("glide.ui.security.allow_codetag", "true") != "true")
						s += title;
					else {
						var displayValue;
						if(insertKBLink){
							s='';
							var baseURL = new sn_communities.CommunityUtilSNC().getInstanceBaseUrl();
							var fullURL = baseURL + '?id=community_question&sys_id=' + response.article.id;
							title = GlideStringUtil.escapeHTML(title);
							displayValue = "<a title='" + title + "' href='";
							displayValue += fullURL + "' >";
							displayValue += title + "</a>";
						}
						else
							return response;
						
						s += "[code]" + displayValue + "[/code]";
					}
					
					response.article.content = s;
				}
			}
			
			return response;
		},
		
		isKnowledgeSearchAvailable: function() {
			var searchField = "" + this.getParameter("sysparm_searchField");
			
			var parts = searchField.split(".");
			
			if (parts.length != 2)
				return false;
			
			var grTable = new GlideRecord(parts[0]);
			var geTarget = grTable.getElement(parts[1]);
			return geTarget.getBooleanAttribute("knowledge_search");
		},
		
		type: "cxs_Knowledge"
	});
```