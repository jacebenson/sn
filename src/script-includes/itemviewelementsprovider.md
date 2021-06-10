---
title: "ItemViewElementsProvider"
id: "itemviewelementsprovider"
---

API Name: global.ItemViewElementsProvider

```js
var ItemViewElementsProvider = Class.create();
ItemViewElementsProvider.prototype = Object.extendsObject(AbstractAjaxProcessor, {

	getElementsIds: function() {
		var itemViewId = this.getParameter('sysparam_item_view_id');
		if (!itemViewId)
			return null;

		var item = new GlideRecord('sys_sg_item_view');
		item.get(itemViewId);
		var itemViewToParse = item.item_view_json;
		if (itemViewToParse == undefined || itemViewToParse == '') {
			gs.addErrorMessage(gs.getMessage("Can't find Item View"));
			return null;
		}

		try {
			var elementProcessor = new ItemViewElementProcessor();
			var idList = elementProcessor.getItemViewElementsIds(itemViewToParse);
			if (idList.length <= 0) {
				gs.addErrorMessage(gs.getMessage("Item View doesn't contain identifiers. You need to resave Item View to fix it"));
				return;
			}

			return JSON.stringify(idList);
		} catch (err) {
			gs.addErrorMessage(gs.getMessage("Can't process Item View: {0}", err.message));
		}
	},

	type: 'ItemViewElementsProvider'
});

```