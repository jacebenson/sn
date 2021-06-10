---
title: "CheckForDuplicateNavigationSectionDest"
id: "checkforduplicatenavigationsectiondest"
---

API Name: global.CheckForDuplicateNavigationSectionDest

```js
var CheckForDuplicateNavigationSectionDest = Class.create();
CheckForDuplicateNavigationSectionDest.prototype = Object.extendsObject(AbstractAjaxProcessor, {
	getCheck: function() {
		var sysId = this.getParameter("sysparm_navigation_section");
		var destForSection = [];
		var gr = new GlideRecord("sys_sg_navigation_section_m2m_destination");
		gr.addQuery('navigation_section',sysId);
		gr.query();
		while(gr.next()) {
			destForSection.push(gr.getValue('navigation_section_destination'));
		}
		
		var destSysId = this.getParameter("sysparm_navigation_section_destination");
		var manySysId = destForSection.join();
		if (manySysId.indexOf(destSysId) == -1)
			return "false";
		return "true";
	},

    type: 'CheckForDuplicateNavigationSectionDest'
});
```