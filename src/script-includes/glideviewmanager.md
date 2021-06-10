---
title: "GlideViewManager"
id: "glideviewmanager"
---

API Name: global.GlideViewManager

```js
var GlideViewManager = Class.create();

GlideViewManager.prototype = Object.extendsObject(AbstractAjaxProcessor, {
	ajaxFunction_execute: function() {
		gs.include("ViewManager");
		var v = new ViewManager(this._getParameter('sysparm_table'), this._getParameter('sysparm_form'));
		v.setView(this._getParameter('sysparm_view'));
		switch (this._getParameter('sysparm_action')) {
			case 'refreshSelected': {
				var addCurrentView = (this._getParameter('sysparm_add_current_view') || "true") === "true";
				v.setAddCurrentView(addCurrentView);
				return v.getViews();
			}

			case 'refreshSection':
				return v.getSections();

			case 'getView': {
				var collection = this._getParameter('sysparm_collection');
				if (collection)
					v.setCollection(collection);
				return v.getSelected();
			}

			case 'getSection':
				return v.getSection();

			case 'createView': {
				v.setTitle(this._getParameter('sysparm_title'));
				v.createView();
				this._saveView(v);
				return v.getViews();
			}

			case 'createSection':
				return v.createSection(this._getParameter('sysparm_caption'));

			case 'promptModifiedOk': {
				this._saveView(v);
				break;
			}
		}
	},

	// This prevents getting "null" and "undefined" as strings
	_getParameter: function(name) {
		var value = this.getParameter(name);
		if (value !== null && value !== undefined)
			return String(value);

		return value;
	},

	_saveView: function(v) {
		v.setView(this._getParameter('sysparm_view'));
		var collection = this._getParameter('sysparm_collection');
		if (collection)
			v.setCollection(collection);
		v.save(this._getParameter('sysparm_avail'), this._getParameter('sysparm_selected'), this._getParameter('sysparm_sections'));
	}
});
```