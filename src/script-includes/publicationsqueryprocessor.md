---
title: "PublicationsQueryProcessor"
id: "publicationsqueryprocessor"
---

API Name: sn_publications.PublicationsQueryProcessor

```js
var PublicationsQueryProcessor = Class.create();

		PublicationsQueryProcessor.prototype = Object.extendsObject(global.AbstractAjaxProcessor, {
			fetchPublications: function() {
				var query = this.getParameter("sysparm_query");
				var limit = parseInt(this.getParameter("sysparm_limit")) || 20;
				var offset = parseInt(this.getParameter("sysparm_offset")) || 0;
				var unreadOnly = this.getParameter("sysparm_unread_only") == 'true';
				var pubGr = this._runQuery(query, limit, offset, unreadOnly);
				var response = {result:[]};								
				if(unreadOnly) {
					response.unreadCount = pubGr.getRowCount();
					response.count = this._runQuery(query, limit, offset, false).getRowCount();
				}else {
					response.unreadCount = this._runQuery(query, limit, offset, true).getRowCount();
					response.count = pubGr.getRowCount();					
				}
				while(pubGr.next()) {
					var pubUserM2mGr = new GlideRecord('sn_publications_publication_contact_m2m');
					var userReadPublication = false;
					pubUserM2mGr.addQuery('publication', pubGr.getUniqueValue());
					pubUserM2mGr.addQuery('user', gs.getUserID());
					pubUserM2mGr.query();
					if(pubUserM2mGr.next()) {
						userReadPublication = true;
					}					
					var pub = {
						content: pubGr.getValue('content_type') == 'wiki' ? pubGr.getDisplayValue('wiki') : pubGr.getDisplayValue('text'),
						sys_id: pubGr.getUniqueValue(),
						category: pubGr.getDisplayValue('category'),
						short_description: pubGr.getValue('short_description'),
						publish_date: pubGr.getDisplayValue('publish_date'),
						expiry_date: pubGr.getDisplayValue('expiry_date'),
						read_publication: userReadPublication
					};
					response.result.push(pub);
				}
				var json = new global.JSON();
				return json.encode(response);
			},
			
			_runQuery: function(query, limit, offset, unreadOnly) {
				var pubGr = new GlideRecord('sn_publications_publication');
				if(query) {
					pubGr.addEncodedQuery(query);
				}
				if(limit) {
					pubGr.chooseWindow(offset, limit + offset, true);
					gs.info("offset:"+offset);
					gs.info("limit:"+limit);					
				}
				if(unreadOnly) {
					var subQuery = pubGr.addJoinQuery('sn_publications_publication_contact_m2m', 'sys_id', 'publication');
					subQuery.addCondition("user", gs.getUserID());
					subQuery.addCondition("viewed_article", false);			
				}
				pubGr.query();
				return pubGr;
			}
		});
```