---
title: "VTBGlobalTags"
id: "vtbglobaltags"
---

API Name: global.VTBGlobalTags

```js
var VTBGlobalTags = Class.create();
VTBGlobalTags.prototype = {
    initialize: function() {
    },

	checkCanCreateGlobalTag: function() {
		if (String(gs.getProperty('glide.vtb.check_global_tags_creator_role', true)) !== 'false')
			return false;

		var boardId = String(gs.getSession().getClientData('global_tag_for_vtb_board'));
		if (!boardId) return false;
		var gr = new GlideRecord('vtb_board');
		gr.get(boardId);
		return new VTBBoardSecurity().canUserAccess(gr, gs.getUser().getID());
	},

    type: 'VTBGlobalTags'
};
```