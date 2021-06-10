---
title: "PublicationsApi"
id: "publicationsapi"
---

API Name: sn_publications.PublicationsApi

```js
var PublicationsApi = Class.create();
PublicationsApi.prototype = {
    initialize: function() {
    },
	
	trackCustomerViewArticle: function(currentUserSysId, currentPublicationId) {
		var pubContactsGr = new GlideRecord('sn_publications_publication_contact_m2m');
		pubContactsGr.addQuery("publication", currentPublicationId);
		pubContactsGr.addQuery("user", currentUserSysId);
		pubContactsGr.query();
		if(pubContactsGr.next()) {
			pubContactsGr.setValue('viewed_article', true);
			pubContactsGr.update();
		}
	},
	
	checkPublicationPassPublishDate: function(publicationId){
		var gr = new GlideRecord('sn_publications_publication');
		if(gr.get(publicationId)){
			var start = (new GlideDateTime(gr.getValue('publish_date'))).getNumericValue();
			var now = new GlideDateTime().getNumericValue();

			if (now >= start){
				return true;
			}else
				return false;

		}else
			return false;
	},

    type: 'PublicationsApi'
};
```