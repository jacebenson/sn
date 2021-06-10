---
title: "AnnouncementUtil"
id: "announcementutil"
---

API Name: global.AnnouncementUtil

```js
var AnnouncementUtil = Class.create();
AnnouncementUtil.prototype = Object.extendsObject(AbstractAjaxProcessor, {
	
	deleteAnnouncementDismissals : function() {
		var annID = this.getParameter('sysparm_announcement_id');
		if (GlideStringUtil.nil(annID))
			return;
		
		var m2mGR = new GlideRecord('m2m_dismissed_announcement');
		if (!m2mGR.canDelete()) {
			gs.addErrorMessage(gs.getMessage("Cannot delete Dismissed Announcement records"));
			return;
		}
		m2mGR.addQuery("announcement", annID);
		m2mGR.deleteMultiple();
	},
	
	type: 'AnnouncementUtil'
});
```